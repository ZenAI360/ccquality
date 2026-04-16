/**
 * Raw JSONL line shapes emitted by Claude Code.
 * Supports both the real Claude Code format (type: "user" | "assistant") and
 * the legacy fixture format (type: "message").
 */

/** Token usage block within an assistant message */
export interface TokenUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

/** Text content block */
export interface TextBlock {
  type: 'text'
  text: string
}

/** Tool use content block (assistant invoking a tool) */
export interface ToolUseBlock {
  type: 'tool_use'
  id: string
  name: string
  input: Record<string, unknown>
}

/** Tool result content block (tool response) */
export interface ToolResultBlock {
  type: 'tool_result'
  tool_use_id: string
  content: string | TextBlock[]
  is_error?: boolean
}

/** Extended thinking content block */
export interface ThinkingBlock {
  type: 'thinking'
  thinking: string
}

/** Union of all content block variants */
export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock

/** Role of a message participant */
export type MessageRole = 'user' | 'assistant'

/**
 * Structured message within a JSONL line.
 * Real format embeds usage here; legacy format has it at the line level.
 */
export interface RawMessage {
  role: MessageRole
  content: ContentBlock[] | string
  /** Present in real Claude Code assistant messages */
  id?: string
  /** Usage stats embedded in real assistant messages */
  usage?: TokenUsage
}

/** Compaction metadata present on summary lines */
export interface CompactionMetadata {
  preTokens: number
  postTokens: number
  summaryTurnIndex: number
}

/**
 * Single parsed line from a Claude Code .jsonl session file.
 *
 * Real format:  type "user" | "assistant" | "queue-operation" | "attachment" | …
 * Legacy format: type "message" | "summary" | "system"
 */
export interface JSONLLine {
  /** Line type — loosened to string to accommodate all real Claude Code variants */
  type: string
  message?: RawMessage
  /** Legacy: usage at line level. Real format puts it inside message.usage */
  usage?: TokenUsage
  timestamp?: string
  sessionId?: string
  /** Present in real format — unique ID for this line */
  uuid?: string
  /** Parent message UUID (real format) */
  parentUuid?: string
  /** True for tool-execution side-chains — should be excluded from main analysis */
  isSidechain?: boolean
  requestId?: string
  compactMetadata?: CompactionMetadata
  /** Preserved raw line for debugging */
  _raw?: string
}
