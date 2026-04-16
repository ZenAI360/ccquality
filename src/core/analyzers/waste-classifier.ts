import type { ParsedSession } from '@/types/session'
import type { AnalysisResult, Finding, Recommendation } from '@/types/analysis'

/**
 * Six token waste categories.
 * - Productive: real work (code generation, explanation)
 * - ReRead: redundant file reads
 * - Retry: looping retries
 * - System: CLAUDE.md + tool schema injection overhead
 * - Compaction: automatic summarisation cost
 * - CacheMiss: input tokens not served from cache.
 *   NOTE: CacheMiss overlaps with the other categories — it is a cross-cutting
 *   view of cache effectiveness and is NOT additive with Productive/ReRead/Retry.
 *   Do not sum CacheMiss with the other categories to compute total waste.
 */
export type WasteCategory =
  | 'Productive'
  | 'ReRead'
  | 'Retry'
  | 'System'
  | 'Compaction'
  | 'CacheMiss'

/** Breakdown of total tokens by waste category. */
export interface WasteBreakdown {
  [K: string]: number
  Productive: number
  ReRead: number
  Retry: number
  System: number
  Compaction: number
  /**
   * Input tokens not served from cache.
   * Non-additive: overlaps other categories; treat as a separate cache-efficiency lens.
   */
  CacheMiss: number
}

/** Estimated tokens per tool-schema injection (one per request). */
const TOOL_SCHEMA_TOKENS = 500

/** Estimated tokens per compaction event. */
const COMPACTION_TOKENS_PER_BOUNDARY = 2000

/** Maximum fraction of total tokens attributable to system overhead. */
const MAX_SYSTEM_OVERHEAD_RATIO = 0.15

/** Maximum fraction of total tokens attributable to compaction overhead. */
const MAX_COMPACTION_OVERHEAD_RATIO = 0.10

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractMetric(result: AnalysisResult, key: string): number {
  return typeof result.metrics[key] === 'number' ? (result.metrics[key] ?? 0) : 0
}

/**
 * Estimates system overhead tokens (tool schema injections), capped at
 * MAX_SYSTEM_OVERHEAD_RATIO of total tokens.
 */
function estimateSystemTokens(turnCount: number, total: number): number {
  return Math.min(
    turnCount * TOOL_SCHEMA_TOKENS,
    Math.round(total * MAX_SYSTEM_OVERHEAD_RATIO),
  )
}

/**
 * Estimates compaction overhead tokens, capped at MAX_COMPACTION_OVERHEAD_RATIO
 * of total tokens.
 */
function estimateCompactionTokens(boundaryCount: number, total: number): number {
  return Math.min(
    boundaryCount * COMPACTION_TOKENS_PER_BOUNDARY,
    Math.round(total * MAX_COMPACTION_OVERHEAD_RATIO),
  )
}

/**
 * Builds the Pareto (top-waste) findings for the classifier result.
 */
function buildParetoFindings(breakdown: WasteBreakdown, total: number): Finding[] {
  const wasteCategories = (['ReRead', 'Retry', 'System', 'Compaction'] as const)
    .map((cat) => ({ cat, tokens: breakdown[cat] }))
    .sort((a, b) => b.tokens - a.tokens)

  const findings: Finding[] = []
  const topWaste = wasteCategories.at(0)
  if (topWaste && topWaste.tokens > 0) {
    const pct = Math.round((topWaste.tokens / total) * 100)
    findings.push({
      id: 'waste-pareto-001',
      severity: pct > 30 ? 'critical' : pct > 15 ? 'warn' : 'info',
      title: `Largest waste category: ${topWaste.cat} (${String(pct)}%)`,
      description: `${topWaste.cat} accounts for ${String(topWaste.tokens)} tokens (${String(pct)}% of session total).`,
      turnRange: undefined,
      tokenImpact: topWaste.tokens,
      evidence: `${String(topWaste.tokens)} / ${String(total)} tokens`,
    })
  }

  const top3 = wasteCategories.slice(0, 3).filter((w) => w.tokens > 0)
  if (top3.length > 1) {
    findings.push({
      id: 'waste-top3-001',
      severity: 'info',
      title: 'Top 3 waste categories',
      description: top3.map((w) => `${w.cat}: ${String(w.tokens)} tokens`).join('; '),
      turnRange: undefined,
      tokenImpact: top3.reduce((sum, w) => sum + w.tokens, 0),
      evidence: top3.map((w) => w.cat).join(', '),
    })
  }

  return findings
}

/**
 * Builds the efficiency recommendation if efficiency is below threshold.
 */
function buildEfficiencyRecommendation(
  efficiency: number,
  topCat: string | undefined,
  findingIds: string[],
): Recommendation[] {
  if (efficiency >= 70) return []
  return [{
    id: 'rec-waste-001',
    priority: efficiency < 40 ? 'critical' : 'high',
    action: `Reduce ${topCat ?? 'waste'} to improve efficiency`,
    detail: `Only ${String(efficiency)}% of tokens are productive. Address the largest waste category first.`,
    relatedFindings: findingIds,
  }]
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Classifies the session's total tokens into six waste categories.
 *
 * @param session - Parsed session
 * @param retryResult - Output of detectRetryLoops
 * @param rereadResult - Output of calculateReReadCost
 * @returns AnalysisResult with WasteBreakdown metrics and a Pareto finding
 */
export function classifyWaste(
  session: ParsedSession,
  retryResult: AnalysisResult,
  rereadResult: AnalysisResult,
): AnalysisResult {
  const total = session.tokenTimeline.totalInput + session.tokenTimeline.totalOutput

  if (total === 0) {
    return {
      engineName: 'wasteClassifier',
      score: 100,
      findings: [],
      metrics: {
        total_tokens: 0, efficiency: 100,
        Productive: 0, ReRead: 0, Retry: 0, System: 0, Compaction: 0, CacheMiss: 0,
      },
      recommendations: [],
    }
  }

  const retryTokens = extractMetric(retryResult, 'waste_tokens')
  const rereadTokens = extractMetric(rereadResult, 'redundant_read_tokens')
  const systemTokens = estimateSystemTokens(session.tokenTimeline.entries.length, total)
  const compactionTokens = estimateCompactionTokens(session.meta.compactionBoundaries.length, total)
  const cacheMissTokens = Math.max(0, session.tokenTimeline.totalInput - session.tokenTimeline.totalCacheRead)
  const productive = Math.max(0, total - retryTokens - rereadTokens - systemTokens - compactionTokens)
  const efficiency = Math.round((productive / total) * 100)

  const breakdown: WasteBreakdown = {
    Productive: productive, ReRead: rereadTokens, Retry: retryTokens,
    System: systemTokens, Compaction: compactionTokens, CacheMiss: cacheMissTokens,
  }

  const findings = buildParetoFindings(breakdown, total)
  const topCat = (['ReRead', 'Retry', 'System', 'Compaction'] as const)
    .map((cat) => ({ cat, tokens: breakdown[cat] }))
    .sort((a, b) => b.tokens - a.tokens)
    .at(0)?.cat

  return {
    engineName: 'wasteClassifier',
    score: efficiency,
    findings,
    metrics: { total_tokens: total, efficiency, ...breakdown },
    recommendations: buildEfficiencyRecommendation(efficiency, topCat, findings.map((f) => f.id)),
  }
}
