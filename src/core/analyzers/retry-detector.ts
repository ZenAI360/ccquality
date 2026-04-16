import type { ParsedSession } from '@/types/session'
import type { AnalysisResult, Finding, Recommendation } from '@/types/analysis'

// ── Helpers ───────────────────────────────────────────────────────────────────

const ERROR_SIGNAL_RE = /\b(error|failed|exception|cannot|could not|unable to)\b/iu

/** Score penalty per loop event (structural). */
const LOOP_PENALTY_PER_EVENT = 20

/** Maximum structural loop penalty before token waste is considered. */
const MAX_LOOP_PENALTY = 60

/** Multiplier converting retry waste percentage to score penalty points. */
const WASTE_PENALTY_MULTIPLIER = 2

/** Maximum waste-based score penalty. */
const MAX_WASTE_PENALTY = 40

/**
 * Normalises a tool input object to a comparable string.
 * Only the primary file/command/code argument is used for similarity.
 */
function inputKey(input: Record<string, unknown>): string {
  const val =
    (input['file_path'] as string | undefined) ??
    (input['command'] as string | undefined) ??
    (input['code'] as string | undefined) ??
    JSON.stringify(input).slice(0, 80)
  return typeof val === 'string' ? val.toLowerCase().trim() : ''
}

/**
 * Returns true when two strings are "similar enough" to count as a repeat.
 */
function areSimilar(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length === 0 || b.length === 0) return false
  const shorter = a.length < b.length ? a : b
  const longer = a.length < b.length ? b : a
  return longer.includes(shorter)
}

// ── Event model ───────────────────────────────────────────────────────────────

interface LoopEvent {
  startTurn: number
  endTurn: number
  toolName: string
  count: number
}

// ── Detectors ─────────────────────────────────────────────────────────────────

/**
 * Detector 1: 3+ consecutive tool calls with the same name and similar input.
 * Identifies runs of repeated identical tool invocations (true looping).
 */
function findConsecutiveRepeats(session: ParsedSession): LoopEvent[] {
  const { toolCalls } = session
  const events: LoopEvent[] = []
  if (toolCalls.length < 3) return events

  let runStart = 0
  let runCount = 1

  for (let i = 1; i < toolCalls.length; i++) {
    const prev = toolCalls.at(i - 1)
    const curr = toolCalls.at(i)
    if (!prev || !curr) continue

    const sameName = prev.name === curr.name
    const similarInput = areSimilar(inputKey(prev.input), inputKey(curr.input))

    if (sameName && similarInput) {
      runCount++
    } else {
      if (runCount >= 3) {
        const startTool = toolCalls.at(runStart)
        const endTool = toolCalls.at(i - 1)
        if (startTool && endTool) {
          events.push({
            startTurn: startTool.turnIndex,
            endTurn: endTool.turnIndex,
            toolName: startTool.name,
            count: runCount,
          })
        }
      }
      runStart = i
      runCount = 1
    }
  }

  if (runCount >= 3) {
    const startTool = toolCalls.at(runStart)
    const endTool = toolCalls.at(-1)
    if (startTool && endTool) {
      events.push({
        startTurn: startTool.turnIndex,
        endTurn: endTool.turnIndex,
        toolName: startTool.name,
        count: runCount,
      })
    }
  }

  return events
}

/**
 * Detector 2: Same error message appearing 2+ times in tool results.
 * Each occurrence beyond the first is a discrete wasted event (startTurn === endTurn).
 * This avoids inflating token waste by spanning the entire session.
 */
function findRepeatedErrors(session: ParsedSession): LoopEvent[] {
  const errorOccurrences = new Map<string, number[]>() // key → turnIndexes

  for (const msg of session.messages) {
    for (const block of msg.contentBlocks) {
      if (block.type !== 'tool_result') continue
      const content = typeof block.content === 'string' ? block.content : ''
      if (!ERROR_SIGNAL_RE.test(content)) continue

      // Normalise: take first 120 chars as the key
      const key = content.slice(0, 120).toLowerCase().trim()
      const existing = errorOccurrences.get(key) ?? []
      existing.push(msg.turnIndex)
      errorOccurrences.set(key, existing)
    }
  }

  const events: LoopEvent[] = []
  for (const [, turns] of errorOccurrences) {
    if (turns.length < 2) continue
    // First occurrence is informative. Each repeat beyond the first is a wasted event.
    for (let i = 1; i < turns.length; i++) {
      const turn = turns[i] ?? 0
      events.push({ startTurn: turn, endTurn: turn, toolName: 'error-repeat', count: 1 })
    }
  }
  return events
}

// ── Token cost estimation ──────────────────────────────────────────────────────

/**
 * Estimates the wasted token cost for a loop event.
 *
 * - Single-turn events (startTurn === endTurn): tokens at that specific turn only.
 * - Multi-turn spans (consecutive repeats): tokens for the excess calls (skipping
 *   the first legitimate invocation).
 */
function eventTokenCost(event: LoopEvent, session: ParsedSession): number {
  const { entries } = session.tokenTimeline

  if (event.startTurn === event.endTurn) {
    const entry = entries.find((e) => e.turn === event.startTurn)
    return entry ? entry.inputTokens + entry.outputTokens : 0
  }

  // Multi-turn span: first call is legitimate, subsequent ones are waste
  const turnsInRange = entries.filter(
    (e) => e.turn >= event.startTurn && e.turn <= event.endTurn,
  )
  if (turnsInRange.length === 0) return 0
  const totalInRange = turnsInRange.reduce((s, e) => s + e.inputTokens + e.outputTokens, 0)
  return Math.round((totalInRange * Math.max(0, event.count - 1)) / event.count)
}

// ── Score calculation ──────────────────────────────────────────────────────────

/**
 * Computes the retryDetector score from event count and waste percentage.
 * Penalises by event count (structural) and token waste (measured).
 */
function computeRetryScore(eventCount: number, retryWastePct: number): number {
  const loopPenalty = Math.min(eventCount * LOOP_PENALTY_PER_EVENT, MAX_LOOP_PENALTY)
  const wastePenalty = Math.min(retryWastePct * WASTE_PENALTY_MULTIPLIER, MAX_WASTE_PENALTY)
  return Math.max(0, Math.round(100 - loopPenalty - wastePenalty))
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Detects retry loops in a parsed session using two complementary detectors.
 *
 * Detector 1: 3+ consecutive identical tool calls.
 * Detector 2: Same error message repeated 2+ times (per occurrence, not a single span).
 *
 * Token waste is event-based rather than span-based, so a repeated error at
 * turn 5 and turn 580 does NOT inflate waste to cover 575 turns of work.
 *
 * @param session - Parsed session to analyse
 * @returns AnalysisResult with retry loop findings and retry_waste metric
 */
export function detectRetryLoops(session: ParsedSession): AnalysisResult {
  const allEvents: LoopEvent[] = [
    ...findConsecutiveRepeats(session),
    ...findRepeatedErrors(session),
  ]

  const totalTokens =
    session.tokenTimeline.totalInput + session.tokenTimeline.totalOutput

  let wasteTokens = 0
  const findings: Finding[] = []

  for (const event of allEvents) {
    const cost = eventTokenCost(event, session)
    wasteTokens += cost
    const findingId = `retry-${String(findings.length + 1).padStart(3, '0')}`
    findings.push({
      id: findingId,
      severity: event.count >= 5 ? 'critical' : 'warn',
      title: `Retry loop detected (${event.toolName}, ×${String(event.count)})`,
      description: `Repeated pattern from turn ${String(event.startTurn)} to ${String(event.endTurn)}.`,
      turnRange: [event.startTurn, event.endTurn],
      tokenImpact: cost,
      evidence: `${event.toolName} repeated ${String(event.count)} times`,
    })
  }

  const retryWaste =
    totalTokens > 0 ? (wasteTokens / totalTokens) * 100 : 0

  const score = computeRetryScore(allEvents.length, retryWaste)

  const recommendations: Recommendation[] = []
  if (findings.length > 0) {
    recommendations.push({
      id: 'rec-retry-001',
      priority: retryWaste > 15 ? 'critical' : 'high',
      action: 'Investigate and eliminate retry loops',
      detail: `${String(findings.length)} loop(s) found, wasting ≈${String(Math.round(retryWaste))}% of session tokens. Add explicit error-handling and self-correction strategies.`,
      relatedFindings: findings.map((f) => f.id),
    })
  }

  return {
    engineName: 'retryDetector',
    score,
    findings,
    metrics: {
      loop_count: allEvents.length,
      retry_waste: Math.round(retryWaste * 10) / 10,
      waste_tokens: wasteTokens,
    },
    recommendations,
  }
}
