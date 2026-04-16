import type { JSONLLine } from '@/types/jsonl'
import type { ParsedSession } from '@/types/session'
import { extractMessages } from './message-extractor'
import { aggregateTokens } from './token-counter'
import { indexToolCalls } from './tool-indexer'
import { detectSessions } from './session-detector'

/** Result of a single line-parse attempt */
interface LineParseResult {
  line: JSONLLine | null
  error: { lineIndex: number; error: string; raw: string } | null
}

/**
 * Attempts to parse one raw JSONL text line.
 * Returns null for empty/whitespace lines without an error entry.
 * @param raw - Raw text of the line
 * @param index - 0-based line index for error reporting
 */
function parseLine(raw: string, index: number): LineParseResult {
  const trimmed = raw.trim()
  if (!trimmed) return { line: null, error: null }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (typeof parsed !== 'object' || parsed === null) {
      return {
        line: null,
        error: { lineIndex: index, error: 'Not a JSON object', raw: trimmed },
      }
    }
    return { line: parsed as JSONLLine, error: null }
  } catch (e) {
    return {
      line: null,
      error: {
        lineIndex: index,
        error: e instanceof Error ? e.message : 'JSON parse error',
        raw: trimmed,
      },
    }
  }
}

/** Maximum accepted file size (200 MB). Larger files are rejected to prevent DoS. */
const MAX_CONTENT_BYTES = 200 * 1024 * 1024

/**
 * Parses a full JSONL session file string into a structured ParsedSession.
 * Invalid lines are skipped and recorded in parseErrors — the function never throws.
 * @param content - Full text content of a .jsonl file
 * @returns Fully parsed session with messages, tokens, and tool index
 * @throws Error if content exceeds MAX_CONTENT_BYTES
 */
export function parseJSONLString(content: string): ParsedSession {
  if (content.length > MAX_CONTENT_BYTES) {
    throw new Error(
      `File too large: ${String(Math.round(content.length / 1024 / 1024))} MB exceeds the 200 MB limit`,
    )
  }
  const rawLines: JSONLLine[] = []
  const parseErrors: ParsedSession['parseErrors'] = []

  const textLines = content.split('\n')

  for (let i = 0; i < textLines.length; i++) {
    const { line, error } = parseLine(textLines[i] ?? '', i)
    if (error) parseErrors.push(error)
    if (line) rawLines.push(line)
  }

  const messages = extractMessages(rawLines)
  const tokenTimeline = aggregateTokens(rawLines)
  const [toolCalls, toolCallsByFile] = indexToolCalls(messages)
  const sessions = detectSessions(rawLines)
  const primaryMeta = sessions[0] ?? {
    sessionId: '__empty__',
    projectName: undefined,
    branch: undefined,
    startTime: undefined,
    endTime: undefined,
    totalTurns: 0,
    compactionBoundaries: [],
    isMultiSession: false,
  }

  return {
    meta: { ...primaryMeta, isMultiSession: sessions.length > 1 },
    messages,
    toolCalls,
    tokenTimeline,
    toolCallsByFile,
    parseErrors,
    rawLines,
  }
}
