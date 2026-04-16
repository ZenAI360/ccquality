import type { ExtractedMessage, ToolCall } from '@/types/session'

/** Tool names that accept a primary file_path argument */
const FILE_TOOLS = new Set(['Read', 'Write', 'Edit', 'Glob', 'NotebookEdit'])

/**
 * Extracts the primary file path from a tool's input, if present.
 * @param toolName - Name of the tool being invoked
 * @param input - Tool input arguments
 * @returns Resolved file path string, or undefined
 */
function extractFilePath(toolName: string, input: Record<string, unknown>): string | undefined {
  if (!FILE_TOOLS.has(toolName)) return undefined
  const path = input['file_path']
  return typeof path === 'string' ? path : undefined
}

/**
 * Builds ToolCall objects from all tool_use blocks in the session.
 * @param messages - Extracted messages to scan for tool_use blocks
 * @returns Flat list of ToolCall objects in sequence order
 */
function buildToolCalls(messages: ExtractedMessage[]): ToolCall[] {
  const calls: ToolCall[] = []
  let seqIndex = 0

  for (const msg of messages) {
    for (const block of msg.contentBlocks) {
      if (block.type !== 'tool_use') continue
      calls.push({
        name: block.name,
        input: block.input,
        id: block.id,
        turnIndex: msg.turnIndex,
        filePath: extractFilePath(block.name, block.input),
        sequenceIndex: seqIndex++,
        prevCallIndex: undefined,
        nextCallIndex: undefined,
      })
    }
  }

  return calls
}

/**
 * Links prev/next indices within the same filePath group.
 * Uses Array.at() which returns T|undefined — safe for out-of-bounds access.
 * Mutates the calls array in place.
 * @param calls - ToolCall list to process
 * @param byFile - Map of filePath → sorted ToolCall list
 */
function linkFileChains(calls: ToolCall[], byFile: Map<string, ToolCall[]>): void {
  for (const group of byFile.values()) {
    for (let i = 0; i < group.length; i++) {
      const call = group.at(i) // T | undefined — safe
      if (!call) continue
      const flat = calls.at(call.sequenceIndex) // T | undefined — safe
      if (!flat) continue
      // at(-1) would wrap, so guard prev explicitly
      const prevEntry = i > 0 ? group.at(i - 1) : undefined
      const nextEntry = group.at(i + 1) // returns undefined when i+1 >= length
      flat.prevCallIndex = prevEntry?.sequenceIndex
      flat.nextCallIndex = nextEntry?.sequenceIndex
    }
  }
}

/**
 * Indexes all tool calls from the session by file path.
 * Also mutates each ToolCall to link prev/next calls for the same file.
 * @param messages - Extracted messages to scan
 * @returns Tuple of [all tool calls, map from filePath to ToolCall[]]
 */
export function indexToolCalls(messages: ExtractedMessage[]): [ToolCall[], Map<string, ToolCall[]>] {
  const calls = buildToolCalls(messages)
  const byFile = new Map<string, ToolCall[]>()

  for (const call of calls) {
    if (!call.filePath) continue
    const existing = byFile.get(call.filePath)
    if (existing) {
      existing.push(call)
    } else {
      byFile.set(call.filePath, [call])
    }
  }

  linkFileChains(calls, byFile)
  return [calls, byFile]
}
