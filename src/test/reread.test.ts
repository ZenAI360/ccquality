import { describe, it, expect } from 'vitest'
import { calculateReReadCost } from '@/core/analyzers/reread-calculator'
import type { ParsedSession, SessionMeta, TokenTimeline, ToolCall } from '@/types/session'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseMeta: SessionMeta = {
  sessionId: 'sess_reread',
  projectName: undefined,
  branch: undefined,
  startTime: undefined,
  endTime: undefined,
  totalTurns: 10,
  compactionBoundaries: [],
  isMultiSession: false,
}

const baseTimeline: TokenTimeline = {
  entries: [],
  totalInput: 0,
  totalOutput: 0,
  totalCacheRead: 0,
  totalCacheCreation: 0,
  cacheHitRatio: 0,
}

function makeReadCall(idx: number, path: string): ToolCall {
  return {
    name: 'Read',
    input: { file_path: path },
    id: `tc${String(idx)}`,
    turnIndex: idx,
    filePath: path,
    sequenceIndex: idx,
    prevCallIndex: undefined,
    nextCallIndex: undefined,
  }
}

function makeSession(toolCalls: ToolCall[], compactionBoundaries: number[] = []): ParsedSession {
  return {
    meta: { ...baseMeta, compactionBoundaries },
    messages: [],
    toolCalls,
    tokenTimeline: baseTimeline,
    toolCallsByFile: new Map(),
    parseErrors: [],
    rawLines: [],
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('calculateReReadCost', () => {
  it('returns score 100 and no redundant tokens when no files are re-read', () => {
    const session = makeSession([
      makeReadCall(0, '/src/app.ts'),
      makeReadCall(1, '/src/utils.ts'),
    ])
    const result = calculateReReadCost(session)
    expect(result.score).toBe(100)
    expect(result.metrics['redundant_read_tokens']).toBe(0)
    expect(result.metrics['reread_overhead']).toBe(0)
  })

  it('counts redundant tokens when a single file is read 10 times', () => {
    const calls = Array.from({ length: 10 }, (_, i) =>
      makeReadCall(i, '/src/heavy.ts'),
    )
    const session = makeSession(calls)
    const result = calculateReReadCost(session)
    // 9 redundant reads × 800 tokens = 7200
    expect(result.metrics['redundant_read_tokens']).toBeGreaterThanOrEqual(7200)
    expect(result.findings.length).toBeGreaterThanOrEqual(1)
    expect(result.score).toBeLessThan(100)
  })

  it('estimates CLAUDE.md injection overhead from compaction boundaries', () => {
    const session = makeSession([], [5, 10, 15]) // 3 boundaries → 4 injections
    const result = calculateReReadCost(session)
    expect(result.metrics['claude_md_injections']).toBe(4)
    expect(result.metrics['claude_md_overhead_tokens']).toBeGreaterThan(0)
  })

  it('returns score 100 for empty session', () => {
    const result = calculateReReadCost(makeSession([]))
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
  })

  it('top-5 worst offenders appear in findings', () => {
    // Create 6 files, each read 3 times
    const calls: ToolCall[] = []
    for (let f = 0; f < 6; f++) {
      for (let r = 0; r < 3; r++) {
        calls.push(makeReadCall(f * 3 + r, `/src/file${String(f)}.ts`))
      }
    }
    const session = makeSession(calls)
    const result = calculateReReadCost(session)
    // Only top 5 file findings should appear (plus maybe CLAUDE.md finding)
    const fileFindings = result.findings.filter((f) => f.id !== 'reread-claudemd')
    expect(fileFindings.length).toBeLessThanOrEqual(5)
  })

  it('engineName is "reReadCalculator"', () => {
    expect(calculateReReadCost(makeSession([])).engineName).toBe('reReadCalculator')
  })
})
