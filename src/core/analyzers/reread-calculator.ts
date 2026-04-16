import type { ParsedSession } from '@/types/session'
import type { AnalysisResult, Finding, Recommendation } from '@/types/analysis'

/** Estimated tokens consumed per Read tool call for an average-sized file. */
const TOKENS_PER_READ = 800

/** Estimated token cost per CLAUDE.md injection into the context. */
const CLAUDE_MD_TOKENS_PER_INJECTION = 1200

/** Filename patterns that identify CLAUDE.md files. */
const CLAUDE_MD_RE = /CLAUDE\.md$/iu

/** Read-family tool names that indicate a file is being read. */
const READ_TOOLS = new Set(['Read', 'NotebookEdit'])

// ── Internal types ────────────────────────────────────────────────────────────

interface FileReadStats {
  filePath: string
  readCount: number
  estimatedTokensPerRead: number
  redundantTokens: number
  turns: number[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Counts how many summary lines contain compactMetadata, used as a proxy
 * for the number of times CLAUDE.md was injected into the context.
 */
function countClaudeMdInjections(session: ParsedSession): number {
  return session.meta.compactionBoundaries.length + 1
}

/**
 * Collects per-file read statistics from the tool call list.
 */
function gatherFileStats(session: ParsedSession): FileReadStats[] {
  const fileMap = new Map<string, FileReadStats>()

  for (const tc of session.toolCalls) {
    if (!READ_TOOLS.has(tc.name)) continue
    const path = tc.filePath ?? `__unknown_${tc.id}`

    const existing = fileMap.get(path)
    if (existing) {
      existing.readCount++
      existing.turns.push(tc.turnIndex)
    } else {
      fileMap.set(path, {
        filePath: path,
        readCount: 1,
        estimatedTokensPerRead: TOKENS_PER_READ,
        redundantTokens: 0,
        turns: [tc.turnIndex],
      })
    }
  }

  // Mark redundant reads (every read after the first)
  for (const stats of fileMap.values()) {
    stats.redundantTokens =
      Math.max(0, stats.readCount - 1) * stats.estimatedTokensPerRead
  }

  return Array.from(fileMap.values())
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Calculates the token cost of redundant file reads in a session.
 *
 * For each file, the first read is considered "necessary". Subsequent reads
 * of the same file are counted as redundant overhead. CLAUDE.md injection
 * cost is also estimated based on compaction boundary count.
 *
 * @param session - Parsed session to analyse
 * @returns AnalysisResult with reread_overhead metric and per-file findings
 */
export function calculateReReadCost(session: ParsedSession): AnalysisResult {
  const fileStats = gatherFileStats(session)

  // CLAUDE.md injection cost
  const claudeMdInjections = countClaudeMdInjections(session)
  const claudeMdCost = claudeMdInjections * CLAUDE_MD_TOKENS_PER_INJECTION

  let uniqueReadTokens = 0
  let redundantReadTokens = 0

  for (const stats of fileStats) {
    uniqueReadTokens += stats.estimatedTokensPerRead
    redundantReadTokens += stats.redundantTokens
  }

  // Add CLAUDE.md as overhead (all injections are "necessary" from the LLM
  // perspective, but excess injections beyond the first are overhead)
  const claudeMdOverheadTokens = Math.max(0, claudeMdInjections - 1) * CLAUDE_MD_TOKENS_PER_INJECTION
  redundantReadTokens += claudeMdOverheadTokens

  const rereadOverhead =
    uniqueReadTokens > 0 ? (redundantReadTokens / uniqueReadTokens) * 100 : 0

  // Findings: files read more than once, sorted by redundant tokens descending
  const findings: Finding[] = []
  const sortedStats = [...fileStats]
    .filter((s) => s.readCount > 1)
    .sort((a, b) => b.redundantTokens - a.redundantTokens)
    .slice(0, 5)

  for (const stats of sortedStats) {
    const findingId = `reread-${String(findings.length + 1).padStart(3, '0')}`
    const isClaudeMd = CLAUDE_MD_RE.test(stats.filePath)
    findings.push({
      id: findingId,
      severity: stats.readCount >= 5 ? 'critical' : 'warn',
      title: `File read ${String(stats.readCount)}× — ${stats.filePath.split('/').at(-1) ?? stats.filePath}`,
      description: isClaudeMd
        ? `CLAUDE.md re-read ${String(stats.readCount)} times. Consider caching its content.`
        : `"${stats.filePath}" was read ${String(stats.readCount)} times. Cache the result to avoid redundant token consumption.`,
      turnRange:
        stats.turns.length >= 2
          ? [stats.turns.at(0) ?? 0, stats.turns.at(-1) ?? 0]
          : undefined,
      tokenImpact: stats.redundantTokens,
      evidence: `First read at turn ${String(stats.turns.at(0) ?? 0)}, last at turn ${String(stats.turns.at(-1) ?? 0)}`,
    })
  }

  // CLAUDE.md overhead finding
  if (claudeMdOverheadTokens > 0) {
    findings.push({
      id: `reread-claudemd`,
      severity: claudeMdInjections >= 5 ? 'critical' : 'info',
      title: `CLAUDE.md injected ${String(claudeMdInjections)}× into context`,
      description: `Each compaction re-injects CLAUDE.md. Estimated overhead: ${String(claudeMdOverheadTokens)} tokens.`,
      turnRange: undefined,
      tokenImpact: claudeMdOverheadTokens,
      evidence: `${String(claudeMdInjections)} injections × ${String(CLAUDE_MD_TOKENS_PER_INJECTION)} tokens`,
    })
  }

  const score = Math.max(0, Math.round(100 - Math.min(rereadOverhead, 100)))

  const recommendations: Recommendation[] = []
  if (redundantReadTokens > 0) {
    const topFile = sortedStats.at(0)
    recommendations.push({
      id: 'rec-reread-001',
      priority: rereadOverhead > 500 ? 'critical' : rereadOverhead > 100 ? 'high' : 'medium',
      action: topFile
        ? `Avoid re-reading "${topFile.filePath.split('/').at(-1) ?? topFile.filePath}"`
        : 'Reduce redundant file reads',
      detail: `Re-read overhead is ${String(Math.round(rereadOverhead))}%. Store file contents in a variable after the first read.`,
      relatedFindings: findings.map((f) => f.id),
    })
  }

  return {
    engineName: 'reReadCalculator',
    score,
    findings,
    metrics: {
      reread_overhead: Math.round(rereadOverhead * 10) / 10,
      redundant_read_tokens: redundantReadTokens,
      unique_read_tokens: uniqueReadTokens,
      claude_md_injections: claudeMdInjections,
      claude_md_overhead_tokens: claudeMdCost,
    },
    recommendations,
  }
}
