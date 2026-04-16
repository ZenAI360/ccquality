import { describe, it, expect } from 'vitest'
import { classifyWaste } from '@/core/analyzers/waste-classifier'
import type { ParsedSession, SessionMeta, TokenTimeline, TokenTimelineEntry } from '@/types/session'
import type { AnalysisResult } from '@/types/analysis'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const baseMeta: SessionMeta = {
  sessionId: 'sess_waste',
  projectName: undefined,
  branch: undefined,
  startTime: undefined,
  endTime: undefined,
  totalTurns: 5,
  compactionBoundaries: [],
  isMultiSession: false,
}

function makeTimeline(totalInput: number, totalOutput: number, cacheRead = 0): TokenTimeline {
  const entry: TokenTimelineEntry = {
    turn: 0,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    cacheRead,
    cacheCreation: 0,
    cumulativeInput: totalInput,
    cumulativeOutput: totalOutput,
  }
  return {
    entries: [entry],
    totalInput,
    totalOutput,
    totalCacheRead: cacheRead,
    totalCacheCreation: 0,
    cacheHitRatio: totalInput > 0 ? cacheRead / totalInput : 0,
  }
}

function makeSession(overrides?: Partial<ParsedSession>): ParsedSession {
  return {
    meta: baseMeta,
    messages: [],
    toolCalls: [],
    tokenTimeline: makeTimeline(0, 0),
    toolCallsByFile: new Map(),
    parseErrors: [],
    rawLines: [],
    ...overrides,
  }
}

function emptyAnalysis(engine: AnalysisResult['engineName']): AnalysisResult {
  return {
    engineName: engine,
    score: 100,
    findings: [],
    metrics: { waste_tokens: 0, redundant_read_tokens: 0 },
    recommendations: [],
  }
}

function analysisWithWaste(
  engine: AnalysisResult['engineName'],
  wasteKey: string,
  tokens: number,
): AnalysisResult {
  return {
    engineName: engine,
    score: 50,
    findings: [],
    metrics: { [wasteKey]: tokens },
    recommendations: [],
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('classifyWaste', () => {
  it('returns score 100 for empty session (no tokens)', () => {
    const result = classifyWaste(
      makeSession(),
      emptyAnalysis('retryDetector'),
      emptyAnalysis('reReadCalculator'),
    )
    expect(result.score).toBe(100)
    expect(result.metrics['total_tokens']).toBe(0)
  })

  it('assigns all tokens as Productive when no waste is detected', () => {
    const session = makeSession({ tokenTimeline: makeTimeline(1000, 500) })
    const result = classifyWaste(
      session,
      emptyAnalysis('retryDetector'),
      emptyAnalysis('reReadCalculator'),
    )
    expect(result.metrics['Productive']).toBeGreaterThan(0)
    expect(result.metrics['efficiency']).toBeGreaterThan(0)
  })

  it('deducts retry waste tokens from Productive', () => {
    const session = makeSession({ tokenTimeline: makeTimeline(2000, 1000) })
    const retryResult = analysisWithWaste('retryDetector', 'waste_tokens', 900)
    const result = classifyWaste(session, retryResult, emptyAnalysis('reReadCalculator'))
    expect(result.metrics['Retry']).toBe(900)
    expect(result.score).toBeLessThan(100)
  })

  it('deducts reread waste tokens from Productive', () => {
    const session = makeSession({ tokenTimeline: makeTimeline(2000, 1000) })
    const rereadResult = analysisWithWaste('reReadCalculator', 'redundant_read_tokens', 600)
    const result = classifyWaste(session, emptyAnalysis('retryDetector'), rereadResult)
    expect(result.metrics['ReRead']).toBe(600)
  })

  it('engineName is "wasteClassifier"', () => {
    const result = classifyWaste(
      makeSession(),
      emptyAnalysis('retryDetector'),
      emptyAnalysis('reReadCalculator'),
    )
    expect(result.engineName).toBe('wasteClassifier')
  })
})
