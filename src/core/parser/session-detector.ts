import type { JSONLLine } from '@/types/jsonl'
import type { SessionMeta } from '@/types/session'

/**
 * Extracts the session ID from a collection of JSONL lines.
 * Priority:
 *   1. queue-operation lines (always have sessionId in real format)
 *   2. Any line with a sessionId field
 *   3. The uuid of the first line (fallback)
 */
function extractSessionId(lines: JSONLLine[]): string {
  const queueLine = lines.find((l) => l.type === 'queue-operation' && l.sessionId)
  if (queueLine?.sessionId) return queueLine.sessionId

  const anyWithId = lines.find((l) => l.sessionId)
  if (anyWithId?.sessionId) return anyWithId.sessionId

  const firstUuid = lines.find((l) => l.uuid)
  return firstUuid?.uuid ?? '__unknown__'
}

/**
 * Detects session metadata from a flat list of JSONL lines.
 * Handles both real Claude Code format and legacy fixture format.
 * @param lines - All parsed JSONL lines from the file
 * @returns Array of SessionMeta, one entry per unique sessionId group
 */
export function detectSessions(lines: JSONLLine[]): SessionMeta[] {
  if (lines.length === 0) return []

  const compactionBoundaries: number[] = []
  const sessionGroups = new Map<string, JSONLLine[]>()

  // Resolve the primary session ID first (for lines that lack it)
  const primarySid = extractSessionId(lines)

  for (const [idx, line] of lines.entries()) {
    if (line.type === 'summary' && line.compactMetadata) {
      compactionBoundaries.push(idx)
    }

    const sid = line.sessionId ?? primarySid
    const group = sessionGroups.get(sid)
    if (group) {
      group.push(line)
    } else {
      sessionGroups.set(sid, [line])
    }
  }

  const isMultiSession = sessionGroups.size > 1
  const results: SessionMeta[] = []

  for (const [sid, group] of sessionGroups) {
    // Count non-sidechain message lines for turn count
    const messageLines = group.filter(
      (l) =>
        (l.type === 'user' || l.type === 'assistant' || l.type === 'message') &&
        l.message !== undefined &&
        l.isSidechain !== true,
    )
    const timestamps = group
      .map((l) => l.timestamp)
      .filter((t): t is string => t !== undefined)
    const firstTs = timestamps.length > 0 ? timestamps[0] : undefined
    const lastTs = timestamps.length > 0 ? timestamps[timestamps.length - 1] : undefined

    results.push({
      sessionId: sid,
      projectName: undefined,
      branch: undefined,
      startTime: firstTs,
      endTime: lastTs,
      totalTurns: messageLines.length,
      compactionBoundaries,
      isMultiSession,
    })
  }

  return results
}
