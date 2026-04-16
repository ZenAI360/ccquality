import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseJSONLString } from '@/core/parser/jsonl-parser'
import { extractMessages } from '@/core/parser/message-extractor'
import { aggregateTokens } from '@/core/parser/token-counter'
import { indexToolCalls } from '@/core/parser/tool-indexer'
import { detectSessions } from '@/core/parser/session-detector'
import type { JSONLLine } from '@/types/jsonl'

// ── Helpers ──────────────────────────────────────────────────────────────────

function msgLine(
  role: 'user' | 'assistant',
  text: string,
  sessionId = 'sess_1',
  usage?: JSONLLine['usage'],
): string {
  const line: JSONLLine = {
    type: 'message',
    message: { role, content: [{ type: 'text', text }] },
    sessionId,
    timestamp: '2026-01-01T00:00:00Z',
    usage,
  }
  return JSON.stringify(line)
}

function toolLine(name: string, filePath: string, sessionId = 'sess_1'): string {
  const line: JSONLLine = {
    type: 'message',
    message: {
      role: 'assistant',
      content: [{ type: 'tool_use', id: `tu_${name}`, name, input: { file_path: filePath } }],
    },
    sessionId,
    usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 80, cache_creation_input_tokens: 0 },
  }
  return JSON.stringify(line)
}

const sampleFixturePath = join(process.cwd(), 'fixtures', 'sample-session.jsonl')

// ── parseJSONLString ──────────────────────────────────────────────────────────

describe('parseJSONLString', () => {
  it('returns an empty ParsedSession for empty content', () => {
    const result = parseJSONLString('')
    expect(result.messages).toHaveLength(0)
    expect(result.toolCalls).toHaveLength(0)
    expect(result.parseErrors).toHaveLength(0)
    expect(result.rawLines).toHaveLength(0)
  })

  it('skips whitespace-only lines without errors', () => {
    const content = `${msgLine('user', 'hello')}\n   \n\t\n${msgLine('assistant', 'world')}`
    const result = parseJSONLString(content)
    expect(result.parseErrors).toHaveLength(0)
    expect(result.messages).toHaveLength(2)
  })

  it('records parse error for invalid JSON and continues', () => {
    const content = `${msgLine('user', 'hi')}\nINVALID_JSON\n${msgLine('assistant', 'ok')}`
    const result = parseJSONLString(content)
    expect(result.parseErrors).toHaveLength(1)
    expect(result.parseErrors[0]?.raw).toBe('INVALID_JSON')
    expect(result.messages).toHaveLength(2)
  })

  it('parses a single message line correctly', () => {
    const result = parseJSONLString(msgLine('user', 'single message'))
    expect(result.messages).toHaveLength(1)
    expect(result.messages[0]?.textContent).toBe('single message')
    expect(result.messages[0]?.role).toBe('user')
  })

  it('parses the sample fixture with correct token totals', () => {
    const content = readFileSync(sampleFixturePath, 'utf-8')
    const result = parseJSONLString(content)
    // Sample has 1 invalid line, rest should parse
    expect(result.parseErrors).toHaveLength(1)
    expect(result.messages.length).toBeGreaterThan(0)
    // Token totals should be > 0
    expect(result.tokenTimeline.totalInput).toBeGreaterThan(0)
    expect(result.tokenTimeline.totalOutput).toBeGreaterThan(0)
  })

  it('detects compaction boundary in sample fixture', () => {
    const content = readFileSync(sampleFixturePath, 'utf-8')
    const result = parseJSONLString(content)
    expect(result.meta.compactionBoundaries.length).toBeGreaterThan(0)
  })
})

// ── extractMessages ───────────────────────────────────────────────────────────

describe('extractMessages', () => {
  it('extracts nothing from an empty line array', () => {
    expect(extractMessages([])).toHaveLength(0)
  })

  it('assigns sequential turnIndex values', () => {
    const lines: JSONLLine[] = [
      JSON.parse(msgLine('user', 'a')) as JSONLLine,
      JSON.parse(msgLine('assistant', 'b')) as JSONLLine,
      JSON.parse(msgLine('user', 'c')) as JSONLLine,
    ]
    const msgs = extractMessages(lines)
    expect(msgs[0]?.turnIndex).toBe(0)
    expect(msgs[1]?.turnIndex).toBe(1)
    expect(msgs[2]?.turnIndex).toBe(2)
  })

  it('handles string content by wrapping in text block', () => {
    const line: JSONLLine = {
      type: 'message',
      message: { role: 'user', content: 'plain string content' },
    }
    const msgs = extractMessages([line])
    expect(msgs[0]?.contentBlocks[0]?.type).toBe('text')
    expect(msgs[0]?.textContent).toBe('plain string content')
  })

  it('extracts thinking blocks without including in textContent', () => {
    const line: JSONLLine = {
      type: 'message',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: 'internal reasoning' },
          { type: 'text', text: 'visible response' },
        ],
      },
    }
    const msgs = extractMessages([line])
    expect(msgs[0]?.textContent).toBe('visible response')
    expect(msgs[0]?.contentBlocks).toHaveLength(2)
  })

  it('skips non-message type lines', () => {
    const lines: JSONLLine[] = [
      JSON.parse(msgLine('user', 'hello')) as JSONLLine,
      { type: 'summary', compactMetadata: { preTokens: 5000, postTokens: 800, summaryTurnIndex: 3 } },
    ]
    const msgs = extractMessages(lines)
    expect(msgs).toHaveLength(1)
  })
})

// ── aggregateTokens ───────────────────────────────────────────────────────────

describe('aggregateTokens', () => {
  it('returns zero totals for empty lines', () => {
    const tl = aggregateTokens([])
    expect(tl.totalInput).toBe(0)
    expect(tl.totalOutput).toBe(0)
    expect(tl.cacheHitRatio).toBe(0)
  })

  it('computes correct totals from multiple usage lines', () => {
    const lines: JSONLLine[] = [
      {
        type: 'message',
        usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 80, cache_creation_input_tokens: 10 },
      },
      {
        type: 'message',
        usage: { input_tokens: 200, output_tokens: 40, cache_read_input_tokens: 160, cache_creation_input_tokens: 20 },
      },
    ]
    const tl = aggregateTokens(lines)
    expect(tl.totalInput).toBe(300)
    expect(tl.totalOutput).toBe(60)
    expect(tl.totalCacheRead).toBe(240)
    expect(tl.entries).toHaveLength(2)
  })

  it('computes cache hit ratio correctly', () => {
    const lines: JSONLLine[] = [
      {
        type: 'message',
        usage: { input_tokens: 100, output_tokens: 20, cache_read_input_tokens: 400, cache_creation_input_tokens: 50 },
      },
    ]
    const tl = aggregateTokens(lines)
    // ratio = 400 / (400 + 50 + 100) = 400/550 ≈ 0.727
    expect(tl.cacheHitRatio).toBeCloseTo(0.727, 2)
  })

  it('skips lines without usage field', () => {
    const lines: JSONLLine[] = [
      { type: 'summary' },
      { type: 'message', message: { role: 'user', content: 'hi' } },
    ]
    const tl = aggregateTokens(lines)
    expect(tl.entries).toHaveLength(0)
    expect(tl.totalInput).toBe(0)
  })
})

// ── indexToolCalls ────────────────────────────────────────────────────────────

describe('indexToolCalls', () => {
  it('returns empty results for messages with no tool calls', () => {
    const msgs = extractMessages([JSON.parse(msgLine('user', 'hello')) as JSONLLine])
    const [calls, byFile] = indexToolCalls(msgs)
    expect(calls).toHaveLength(0)
    expect(byFile.size).toBe(0)
  })

  it('indexes Read calls by file path', () => {
    const lines = [toolLine('Read', '/src/foo.ts'), toolLine('Read', '/src/bar.ts')]
    const msgs = extractMessages(lines.map((l) => JSON.parse(l) as JSONLLine))
    const [calls, byFile] = indexToolCalls(msgs)
    expect(calls).toHaveLength(2)
    expect(byFile.has('/src/foo.ts')).toBe(true)
    expect(byFile.has('/src/bar.ts')).toBe(true)
  })

  it('links prev/next indices for same file path', () => {
    const lines = [
      toolLine('Read', '/src/app.ts'),
      toolLine('Read', '/src/app.ts'),
      toolLine('Read', '/src/app.ts'),
    ]
    const msgs = extractMessages(lines.map((l) => JSON.parse(l) as JSONLLine))
    const [calls] = indexToolCalls(msgs)
    expect(calls[0]?.prevCallIndex).toBeUndefined()
    expect(calls[0]?.nextCallIndex).toBe(1)
    expect(calls[1]?.prevCallIndex).toBe(0)
    expect(calls[1]?.nextCallIndex).toBe(2)
    expect(calls[2]?.prevCallIndex).toBe(1)
    expect(calls[2]?.nextCallIndex).toBeUndefined()
  })

  it('does not link Bash calls (not a file tool)', () => {
    const line: JSONLLine = {
      type: 'message',
      message: {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'tu_bash', name: 'Bash', input: { command: 'ls' } }],
      },
    }
    const msgs = extractMessages([line])
    const [calls, byFile] = indexToolCalls(msgs)
    expect(calls[0]?.filePath).toBeUndefined()
    expect(byFile.size).toBe(0)
  })
})

// ── detectSessions ────────────────────────────────────────────────────────────

describe('detectSessions', () => {
  it('returns empty array for empty lines', () => {
    expect(detectSessions([])).toHaveLength(0)
  })

  it('detects a single session', () => {
    const lines: JSONLLine[] = [
      JSON.parse(msgLine('user', 'hi', 'sess_001')) as JSONLLine,
      JSON.parse(msgLine('assistant', 'hello', 'sess_001')) as JSONLLine,
    ]
    const sessions = detectSessions(lines)
    expect(sessions).toHaveLength(1)
    expect(sessions[0]?.sessionId).toBe('sess_001')
  })

  it('detects multiple sessions (multi-session file)', () => {
    const lines: JSONLLine[] = [
      JSON.parse(msgLine('user', 'first', 'sess_A')) as JSONLLine,
      JSON.parse(msgLine('user', 'second', 'sess_B')) as JSONLLine,
    ]
    const sessions = detectSessions(lines)
    expect(sessions).toHaveLength(2)
    expect(sessions[0]?.isMultiSession).toBe(true)
  })

  it('detects compaction boundary from summary lines', () => {
    const lines: JSONLLine[] = [
      JSON.parse(msgLine('user', 'hi', 'sess_1')) as JSONLLine,
      {
        type: 'summary',
        compactMetadata: { preTokens: 5000, postTokens: 800, summaryTurnIndex: 1 },
        sessionId: 'sess_1',
      },
      JSON.parse(msgLine('user', 'resumed', 'sess_1')) as JSONLLine,
    ]
    const sessions = detectSessions(lines)
    expect(sessions[0]?.compactionBoundaries).toContain(1)
  })
})
