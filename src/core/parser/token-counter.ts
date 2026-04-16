import type { JSONLLine } from '@/types/jsonl'
import type { TokenTimeline, TokenTimelineEntry } from '@/types/session'

/**
 * Computes the cache hit ratio from aggregate token counts.
 * cache_read / (cache_read + cache_creation + input) — returns 0 if denominator is 0.
 */
function computeCacheHitRatio(
  totalCacheRead: number,
  totalCacheCreation: number,
  totalInput: number,
): number {
  const denominator = totalCacheRead + totalCacheCreation + totalInput
  return denominator === 0 ? 0 : totalCacheRead / denominator
}

/**
 * Resolves the token usage object for a line.
 * Real Claude Code format: usage is inside message.usage
 * Legacy fixture format: usage is at line level
 */
function resolveUsage(line: JSONLLine) {
  return line.message?.usage ?? line.usage
}

/**
 * Returns true if this line should contribute to the token timeline.
 * Only non-sidechain assistant/message lines have meaningful per-turn token data.
 */
function isCountableLine(line: JSONLLine): boolean {
  if (line.isSidechain === true) return false
  return (
    line.type === 'assistant' ||
    line.type === 'message' // legacy fixture format
  )
}

/**
 * Aggregates token usage from all JSONL lines into a per-turn timeline.
 *
 * Supports:
 *   - Real format: type "assistant" with message.usage
 *   - Legacy format: type "message" with line.usage
 *
 * Only assistant-side lines are counted (they carry cumulative per-request stats).
 * Duplicate streaming records are deduplicated by message.id.
 *
 * @param lines - Parsed JSONL lines
 * @returns TokenTimeline with per-turn and cumulative counts
 */
export function aggregateTokens(lines: JSONLLine[]): TokenTimeline {
  // Deduplicate by message.id (keep last record per API response)
  const idToIndex = new Map<string, number>()
  const deduped: JSONLLine[] = []
  for (const line of lines) {
    if (!isCountableLine(line)) continue
    const msgId = line.message?.id
    if (msgId !== undefined) {
      const existing = idToIndex.get(msgId)
      if (existing !== undefined) {
        deduped[existing] = line
      } else {
        idToIndex.set(msgId, deduped.length)
        deduped.push(line)
      }
    } else {
      deduped.push(line)
    }
  }

  const entries: TokenTimelineEntry[] = []
  let cumInput = 0
  let cumOutput = 0
  let totalCacheRead = 0
  let totalCacheCreation = 0
  let turn = 0

  for (const line of deduped) {
    const usage = resolveUsage(line)
    if (!usage) continue
    const { input_tokens, output_tokens, cache_read_input_tokens, cache_creation_input_tokens } =
      usage

    cumInput += input_tokens
    cumOutput += output_tokens
    totalCacheRead += cache_read_input_tokens
    totalCacheCreation += cache_creation_input_tokens

    entries.push({
      turn: turn++,
      inputTokens: input_tokens,
      outputTokens: output_tokens,
      cacheRead: cache_read_input_tokens,
      cacheCreation: cache_creation_input_tokens,
      cumulativeInput: cumInput,
      cumulativeOutput: cumOutput,
    })
  }

  return {
    entries,
    totalInput: cumInput,
    totalOutput: cumOutput,
    totalCacheRead,
    totalCacheCreation,
    cacheHitRatio: computeCacheHitRatio(totalCacheRead, totalCacheCreation, cumInput),
  }
}
