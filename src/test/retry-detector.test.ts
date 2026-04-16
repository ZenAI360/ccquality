import { describe, it, expect } from 'vitest'
import { detectRetryLoops } from '@/core/analyzers/retry-detector'
import type { ParsedSession, SessionMeta, TokenTimeline, ExtractedMessage, ToolCall } from '@/types/session'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseMeta: SessionMeta = {
  sessionId: 'sess_retry',
  projectName: undefined,
  branch: undefined,
  startTime: undefined,
  endTime: undefined,
  totalTurns: 0,
  compactionBoundaries: [],
  isMultiSession: false,
}

const baseTimeline: TokenTimeline = {
  entries: [],
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  cacheHitRatio: 0,
}

function makeSession(overrides?: Partial<ParsedSession>): ParsedSession {
  return {
    meta: baseMeta,
    messages: [],
    toolCalls: [],
    tokenTimeline: baseTimeline,
    toolCallsByFile: new Map(),
    parseErrors: [],
    rawLines: [],
    ...overrides,
  }
}

function makeReadCall(idx: number, path = '/src/app.ts'): ToolCall {
  return {
    name: 'Read',
    input: { file_path: path },
    id: `tc${String(idx)}`,
    turnIndex: idx,
    filePath: path,
    sequenceIndex: idx,
    prevCallIndex: idx > 0 ? idx - 1 : undefined,
    nextCallIndex: undefined,
  }
}

function makeAssistantMsg(text: string, turn: number): ExtractedMessage {
  return {
    role: 'assistant',
    contentBlocks: [{ type: 'text', text }],
    textContent: text,
    turnIndex: turn,
    timestamp: undefined,
    sessionId: 'sess_retry',
    usage: undefined,
  }
}

function makeToolResultMsg(content: string, turn: number): ExtractedMessage {
  return {
    role: 'user',
    contentBlocks: [{ type: 'tool_result', tool_use_id: `tu${String(turn)}`, content }],
    textContent: '',
    turnIndex: turn,
    timestamp: undefined,
    sessionId: 'sess_retry',
    usage: undefined,
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('detectRetryLoops', () => {
  it('returns score 100 and no findings for a clean session', () => {
    const session = makeSession({
      toolCalls: [makeReadCall(0), makeReadCall(1, '/src/utils.ts')],
    })
    const result = detectRetryLoops(session)
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
    expect(result.metrics['loop_count']).toBe(0)
  })

  it('detects 3+ consecutive identical Read calls as a loop', () => {
    const session = makeSession({
      toolCalls: [
        makeReadCall(0),
        makeReadCall(1),
        makeReadCall(2),
        makeReadCall(3),
      ],
    })
    const result = detectRetryLoops(session)
    expect(result.findings.some((f) => f.title.includes('retry') || f.title.includes('Retry'))).toBe(true)
    expect(result.metrics['loop_count']).toBeGreaterThanOrEqual(1)
  })

  it('detects repeated error messages in tool results', () => {
    const errMsg = 'Error: cannot read file /missing.ts'
    const session = makeSession({
      messages: [
        makeToolResultMsg(errMsg, 1),
        makeToolResultMsg(errMsg, 3),
      ],
    })
    const result = detectRetryLoops(session)
    expect(result.findings.some((f) => f.title.includes('error-repeat') || f.evidence?.includes('error-repeat'))).toBe(true)
  })

  it('does NOT flag "I apologize" text as a retry loop (text-signal detector removed)', () => {
    const session = makeSession({
      messages: [
        makeAssistantMsg('I apologize, that did not work.', 1),
        makeAssistantMsg('Let me retry with a different approach.', 3),
      ],
    })
    const result = detectRetryLoops(session)
    expect(result.findings.every((f) => !f.title.includes('text-signal'))).toBe(true)
    expect(result.score).toBe(100)
  })

  it('computes retry_waste metric as a percentage', () => {
    const session = makeSession({
      toolCalls: [makeReadCall(0), makeReadCall(1), makeReadCall(2)],
      tokenTimeline: {
        ...baseTimeline,
        entries: [
          { turn: 0, inputTokens: 100, outputTokens: 50, cacheRead: 0, cacheCreation: 0, cumulativeInput: 100, cumulativeOutput: 50 },
          { turn: 1, inputTokens: 100, outputTokens: 50, cacheRead: 0, cacheCreation: 0, cumulativeInput: 200, cumulativeOutput: 100 },
          { turn: 2, inputTokens: 100, outputTokens: 50, cacheRead: 0, cacheCreation: 0, cumulativeInput: 300, cumulativeOutput: 150 },
        ],
        totalInput: 300,
        totalOutput: 150,
      },
    })
    const result = detectRetryLoops(session)
    expect(result.metrics['retry_waste']).toBeGreaterThanOrEqual(0)
    expect(typeof result.metrics['retry_waste']).toBe('number')
  })

  it('scores below 100 when loops are present', () => {
    const session = makeSession({
      toolCalls: [
        makeReadCall(0),
        makeReadCall(1),
        makeReadCall(2),
        makeReadCall(3),
        makeReadCall(4),
      ],
    })
    const result = detectRetryLoops(session)
    expect(result.score).toBeLessThan(100)
  })

  it('creates separate findings per error repeat (not one giant span)', () => {
    const errMsg = 'Error: cannot read file /missing.ts'
    // Same error at turns 2, 100, 300 — should produce 2 events (repeats 2 and 3)
    const session = makeSession({
      messages: [
        makeToolResultMsg(errMsg, 2),
        makeToolResultMsg(errMsg, 100),
        makeToolResultMsg(errMsg, 300),
      ],
    })
    const result = detectRetryLoops(session)
    // 2 wasted repeats → 2 findings
    const errorFindings = result.findings.filter((f) => f.evidence?.includes('error-repeat'))
    expect(errorFindings).toHaveLength(2)
    // Each event should NOT span across all turns
    for (const f of errorFindings) {
      expect(f.turnRange?.[0]).toBe(f.turnRange?.[1])
    }
  })

  it('engineName is "retryDetector"', () => {
    expect(detectRetryLoops(makeSession()).engineName).toBe('retryDetector')
  })
})
