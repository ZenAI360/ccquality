import { bench, describe } from 'vitest'
import { parseJSONLString } from '@/core/parser/jsonl-parser'

/** Generates a single JSONL line for a given session. */
function makeLine(turn: number, sessionId: string): string {
  return JSON.stringify({
    type: 'message',
    message: {
      role: turn % 2 === 0 ? 'user' : 'assistant',
      content: [{ type: 'text', text: `Turn ${String(turn)} content. `.repeat(20) }],
    },
    usage: {
      input_tokens: 1000 + turn,
      output_tokens: 200 + turn,
      cache_read_input_tokens: 800,
      cache_creation_input_tokens: 0,
    },
    timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, turn)).toISOString(),
    sessionId,
  })
}

/**
 * Generates a synthetic JSONL string of approximately targetSizeMb megabytes.
 * Each line is ~600-700 bytes, so ~1500 lines ≈ 1 MB.
 */
function generateJSONL(targetSizeMb: number): string {
  const linesPerMb = 1500
  const lineCount = targetSizeMb * linesPerMb
  const lines: string[] = []
  for (let i = 0; i < lineCount; i++) {
    lines.push(makeLine(i, 'sess_bench'))
  }
  return lines.join('\n')
}

// Generate test payloads once (outside bench to exclude generation time)
const payload1MB = generateJSONL(1)
const payload10MB = generateJSONL(10)
const payload50MB = generateJSONL(50)

describe('JSONL parser performance', () => {
  bench('parse 1 MB JSONL', () => {
    parseJSONLString(payload1MB)
  }, { time: 2000 })

  bench('parse 10 MB JSONL', () => {
    parseJSONLString(payload10MB)
  }, { time: 3000 })

  bench('parse 50 MB JSONL (target: < 5000 ms)', () => {
    parseJSONLString(payload50MB)
  }, { time: 10000, iterations: 1 })
})
