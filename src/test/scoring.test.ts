import { describe, it, expect } from 'vitest'
import { calculateSQI } from '@/core/scoring/sqi-calculator'
import { tagAnomalies } from '@/core/scoring/anomaly-tagger'
import { generateRecommendations } from '@/core/scoring/recommendation-engine'
import { exportJSON } from '@/core/scoring/report-exporter'
import type { AnalysisResult } from '@/types/analysis'
import type { ParsedSession, SessionMeta, TokenTimeline } from '@/types/session'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeResult(
  engine: AnalysisResult['engineName'],
  score: number,
  metrics: Record<string, number> = {},
): AnalysisResult {
  return { engineName: engine, score, findings: [], metrics, recommendations: [] }
}

const perfectResults: AnalysisResult[] = [
  makeResult('compliance', 100),
  makeResult('reReadCalculator', 100, { reread_overhead: 0, redundant_read_tokens: 0 }),
  makeResult('retryDetector', 100, { retry_waste: 0, waste_tokens: 0 }),
  makeResult('deadZoneMapper', 100),
  makeResult('wasteClassifier', 100, { total_tokens: 1000, CacheMiss: 50 }),
]

const poorResults: AnalysisResult[] = [
  makeResult('compliance', 20),
  makeResult('reReadCalculator', 10, { reread_overhead: 600, redundant_read_tokens: 5000 }),
  makeResult('retryDetector', 5, { retry_waste: 40, waste_tokens: 3000 }),
  makeResult('deadZoneMapper', 30),
  makeResult('wasteClassifier', 15, { total_tokens: 10000, CacheMiss: 9000 }),
]

const baseMeta: SessionMeta = {
  sessionId: 'sess_score_test',
  projectName: 'TestProject',
  branch: 'main',
  startTime: '2026-01-01T10:00:00Z',
  endTime: '2026-01-01T11:00:00Z',
  totalTurns: 20,
  compactionBoundaries: [],
  isMultiSession: false,
}

const baseTimeline: TokenTimeline = {
  entries: [],
  totalInput: 5000,
  totalOutput: 2000,
  totalCacheRead: 3000,
  totalCacheCreation: 500,
  cacheHitRatio: 0.6,
}

function makeSession(): ParsedSession {
  return {
    meta: baseMeta,
    messages: [],
    toolCalls: [],
    tokenTimeline: baseTimeline,
    toolCallsByFile: new Map(),
    parseErrors: [],
    rawLines: [],
  }
}

// ── SQI Calculator ────────────────────────────────────────────────────────────

describe('calculateSQI', () => {
  it('returns overall >= 90 for a perfect session', () => {
    const sqi = calculateSQI(perfectResults)
    expect(sqi.overall).toBeGreaterThanOrEqual(90)
    expect(sqi.rating).toBe('good')
  })

  it('returns overall <= 30 for a poor session', () => {
    const sqi = calculateSQI(poorResults)
    expect(sqi.overall).toBeLessThanOrEqual(30)
    expect(sqi.rating).toBe('critical')
  })

  it('returns average rating when score is 50-79', () => {
    const midResults: AnalysisResult[] = [
      makeResult('compliance', 60),
      makeResult('reReadCalculator', 65),
      makeResult('retryDetector', 65),
      makeResult('deadZoneMapper', 70),
      makeResult('wasteClassifier', 55),
    ]
    const sqi = calculateSQI(midResults)
    expect(sqi.rating).toBe('average')
  })

  it('breakdown matches individual engine scores', () => {
    const sqi = calculateSQI(perfectResults)
    expect(sqi.breakdown.compliance).toBe(100)
    expect(sqi.breakdown.readEfficiency).toBe(100)
  })

  it('applies 0.85 multiplicative penalty when loop_count > 10', () => {
    const highRetryResults: AnalysisResult[] = [
      makeResult('compliance', 100),
      makeResult('reReadCalculator', 100, { reread_overhead: 0, redundant_read_tokens: 0 }),
      makeResult('retryDetector', 80, { loop_count: 15, retry_waste: 5, waste_tokens: 0 }),
      makeResult('deadZoneMapper', 100),
      makeResult('wasteClassifier', 100, { total_tokens: 1000, CacheMiss: 0 }),
    ]
    const withPenalty = calculateSQI(highRetryResults)
    // raw = 100*0.25 + 100*0.25 + 80*0.20 + 100*0.15 + 100*0.15 = 96 → 96*0.85 ≈ 82
    expect(withPenalty.overall).toBeLessThan(96)
    expect(withPenalty.overall).toBeGreaterThan(75)
  })

  it('applies 0.85 multiplicative penalty when retry_waste > 20', () => {
    const highWasteResults: AnalysisResult[] = [
      makeResult('compliance', 100),
      makeResult('reReadCalculator', 100, { reread_overhead: 0, redundant_read_tokens: 0 }),
      makeResult('retryDetector', 60, { loop_count: 3, retry_waste: 25, waste_tokens: 500 }),
      makeResult('deadZoneMapper', 100),
      makeResult('wasteClassifier', 60, { total_tokens: 1000, CacheMiss: 0 }),
    ]
    const noPenaltyResults: AnalysisResult[] = [
      makeResult('compliance', 100),
      makeResult('reReadCalculator', 100, { reread_overhead: 0, redundant_read_tokens: 0 }),
      makeResult('retryDetector', 60, { loop_count: 3, retry_waste: 5, waste_tokens: 500 }),
      makeResult('deadZoneMapper', 100),
      makeResult('wasteClassifier', 60, { total_tokens: 1000, CacheMiss: 0 }),
    ]
    const withPenalty = calculateSQI(highWasteResults)
    const withoutPenalty = calculateSQI(noPenaltyResults)
    expect(withPenalty.overall).toBeLessThan(withoutPenalty.overall)
  })
})

// ── Anomaly Tagger ────────────────────────────────────────────────────────────

describe('tagAnomalies', () => {
  it('produces critical anomaly when retry_waste > 15%', () => {
    const sqi = calculateSQI(poorResults)
    const anomalies = tagAnomalies(sqi, poorResults)
    const retryAnomaly = anomalies.find((a) => a.type === 'retry_waste')
    expect(retryAnomaly?.severity).toBe('critical')
  })

  it('produces critical anomaly when reread_overhead > 500%', () => {
    const sqi = calculateSQI(poorResults)
    const anomalies = tagAnomalies(sqi, poorResults)
    const rereadAnomaly = anomalies.find((a) => a.type === 'reread_overhead')
    expect(rereadAnomaly?.severity).toBe('critical')
  })

  it('produces no anomalies for a perfect session', () => {
    const sqi = calculateSQI(perfectResults)
    const anomalies = tagAnomalies(sqi, perfectResults)
    expect(anomalies).toHaveLength(0)
  })

  it('returns warn anomaly when compliance score is 40-60', () => {
    const mixedResults: AnalysisResult[] = [
      makeResult('compliance', 50),
      makeResult('reReadCalculator', 90, { reread_overhead: 0 }),
      makeResult('retryDetector', 90, { retry_waste: 0 }),
      makeResult('deadZoneMapper', 90),
      makeResult('wasteClassifier', 90, { total_tokens: 1000, CacheMiss: 0 }),
    ]
    const sqi = calculateSQI(mixedResults)
    const anomalies = tagAnomalies(sqi, mixedResults)
    const complianceAnomaly = anomalies.find((a) => a.type === 'low_compliance')
    expect(complianceAnomaly?.severity).toBe('warn')
  })
})

// ── Recommendation Engine ─────────────────────────────────────────────────────

describe('generateRecommendations', () => {
  it('produces critical recommendation for critical anomaly', () => {
    const sqi = calculateSQI(poorResults)
    const anomalies = tagAnomalies(sqi, poorResults)
    const recs = generateRecommendations(sqi, anomalies)
    const critical = recs.find((r) => r.priority === 'critical')
    expect(critical).toBeDefined()
  })

  it('returns empty for a perfect session', () => {
    const sqi = calculateSQI(perfectResults)
    const anomalies = tagAnomalies(sqi, perfectResults)
    const recs = generateRecommendations(sqi, anomalies)
    expect(recs).toHaveLength(0)
  })

  it('recommendations are sorted critical first', () => {
    const sqi = calculateSQI(poorResults)
    const anomalies = tagAnomalies(sqi, poorResults)
    const recs = generateRecommendations(sqi, anomalies)
    if (recs.length >= 2) {
      const priorities = ['critical', 'high', 'medium', 'low']
      const firstIdx = priorities.indexOf(recs.at(0)?.priority ?? 'low')
      const lastIdx = priorities.indexOf(recs.at(-1)?.priority ?? 'low')
      expect(firstIdx).toBeLessThanOrEqual(lastIdx)
    }
  })
})

// ── Report Exporter ───────────────────────────────────────────────────────────

describe('exportJSON', () => {
  it('produces valid JSON with the correct schema structure', () => {
    const sqi = calculateSQI(perfectResults)
    const session = makeSession()
    const json = exportJSON(sqi, session)
    const parsed: unknown = JSON.parse(json)
    expect(typeof parsed).toBe('object')
    const report = parsed as Record<string, unknown>
    expect(report['version']).toBe('1')
    expect(report['session']).toBeDefined()
    expect(report['sqi']).toBeDefined()
    expect(Array.isArray(report['anomalies'])).toBe(true)
    expect(Array.isArray(report['recommendations'])).toBe(true)
  })
})
