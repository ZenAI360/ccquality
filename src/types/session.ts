import type { JSONLLine, TokenUsage, ContentBlock, MessageRole } from './jsonl'

/** A single extracted message with full metadata */
export interface ExtractedMessage {
  role: MessageRole
  contentBlocks: ContentBlock[]
  /** Plain text aggregated from all text blocks */
  textContent: string
  turnIndex: number
  timestamp: string | undefined
  sessionId: string | undefined
  usage: TokenUsage | undefined
}

/** A tool call with file path context */
export interface ToolCall {
  /** Tool name, e.g. "Read", "Write", "Bash" */
  name: string
  /** Input arguments passed to the tool */
  input: Record<string, unknown>
  /** Tool use ID from the content block */
  id: string
  /** Index of the turn this call belongs to */
  turnIndex: number
  /** Primary file path if the tool operates on a file */
  filePath: string | undefined
  /** Index within the session's flat tool-call list */
  sequenceIndex: number
  /** Previous tool call index operating on the same filePath */
  prevCallIndex: number | undefined
  /** Next tool call index operating on the same filePath */
  nextCallIndex: number | undefined
}

/** Token counts for one turn */
export interface TokenTimelineEntry {
  turn: number
  inputTokens: number
  outputTokens: number
  cacheRead: number
  cacheCreation: number
  /** Running total input tokens up to and including this turn */
  cumulativeInput: number
  /** Running total output tokens up to and including this turn */
  cumulativeOutput: number
}

/** Token timeline aggregated from all turns */
export interface TokenTimeline {
  entries: TokenTimelineEntry[]
  totalInput: number
  totalOutput: number
  totalCacheRead: number
  totalCacheCreation: number
  /** cache_read / (cache_read + cache_creation + input) ratio 0–1 */
  cacheHitRatio: number
}

/** High-level session metadata */
export interface SessionMeta {
  sessionId: string
  projectName: string | undefined
  /** Branch extracted from env or summary lines */
  branch: string | undefined
  startTime: string | undefined
  endTime: string | undefined
  totalTurns: number
  /** Line indices where compaction occurred */
  compactionBoundaries: number[]
  /** Whether the session contains multiple session IDs */
  isMultiSession: boolean
}

/** Fully parsed Claude Code session */
export interface ParsedSession {
  meta: SessionMeta
  messages: ExtractedMessage[]
  toolCalls: ToolCall[]
  tokenTimeline: TokenTimeline
  /** Tool calls grouped by file path */
  toolCallsByFile: Map<string, ToolCall[]>
  /** Raw lines that failed to parse */
  parseErrors: Array<{ lineIndex: number; error: string; raw: string }>
  /** All raw lines (for reference) */
  rawLines: JSONLLine[]
}
