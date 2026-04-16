import type { JSONLLine, ContentBlock, RawMessage } from '@/types/jsonl'
import type { ExtractedMessage } from '@/types/session'

/**
 * Normalises raw message content into a ContentBlock array.
 * Handles both array-format and string-format content fields.
 */
function normaliseContent(content: RawMessage['content']): ContentBlock[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }]
  }
  return content
}

/**
 * Aggregates plain text from all text blocks in a content array.
 */
function aggregateText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
}

/**
 * Returns true if a line carries a user or assistant message.
 * Handles both real Claude Code format (type: "user" | "assistant")
 * and legacy fixture format (type: "message").
 */
function isMessageLine(line: JSONLLine): boolean {
  if (!line.message) return false
  return (
    line.type === 'user' ||
    line.type === 'assistant' ||
    line.type === 'message'
  )
}

/**
 * Deduplicates assistant messages by their message.id.
 * Claude Code emits multiple streaming records for the same API response;
 * only the LAST record carries the final usage stats and complete content.
 */
function deduplicateByMessageId(lines: JSONLLine[]): JSONLLine[] {
  const idToIndex = new Map<string, number>()
  const result: JSONLLine[] = []

  for (const line of lines) {
    const msgId = line.message?.id
    if (msgId !== undefined) {
      const existing = idToIndex.get(msgId)
      if (existing !== undefined) {
        // Replace earlier record with this (later) one
        result[existing] = line
      } else {
        idToIndex.set(msgId, result.length)
        result.push(line)
      }
    } else {
      result.push(line)
    }
  }

  return result
}

/**
 * Extracts structured messages from parsed JSONL lines.
 *
 * Supports:
 *   - Real format: type "user" / "assistant" with nested message.usage
 *   - Legacy format: type "message" with line-level usage
 *
 * Side-chain lines (isSidechain: true) are excluded — these are tool-execution
 * branches that would skew turn counts and token totals.
 *
 * @param lines - Parsed JSONL lines from the session
 * @returns Array of extracted messages with metadata
 */
export function extractMessages(lines: JSONLLine[]): ExtractedMessage[] {
  const messageLines = lines.filter((l) => isMessageLine(l) && l.isSidechain !== true)
  const deduped = deduplicateByMessageId(messageLines)

  const messages: ExtractedMessage[] = []
  let turnIndex = 0

  for (const line of deduped) {
    if (!line.message) continue

    const contentBlocks = normaliseContent(line.message.content)
    // Usage: real format stores it inside message.usage; legacy at line.usage
    const usage = line.message.usage ?? line.usage

    messages.push({
      role: line.message.role,
      contentBlocks,
      textContent: aggregateText(contentBlocks),
      turnIndex: turnIndex++,
      timestamp: line.timestamp,
      sessionId: line.sessionId,
      usage,
    })
  }

  return messages
}
