import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { parseJSONLString } from '@/core/parser/jsonl-parser'
import { extractRules } from '@/core/analyzers/rule-extractor'
import { checkCompliance } from '@/core/analyzers/compliance-checker'
import { detectRetryLoops } from '@/core/analyzers/retry-detector'
import { calculateReReadCost } from '@/core/analyzers/reread-calculator'
import { classifyWaste } from '@/core/analyzers/waste-classifier'
import { mapDeadZones } from '@/core/analyzers/deadzone-mapper'
import { calculateSQI } from '@/core/scoring/sqi-calculator'
import { tagAnomalies } from '@/core/scoring/anomaly-tagger'
import { generateRecommendations } from '@/core/scoring/recommendation-engine'
import { exportJSON } from '@/core/scoring/report-exporter'

// ── Fixtures ──────────────────────────────────────────────────────────────────

function loadFixture(name: string): string {
  return readFileSync(join(__dirname, '../../fixtures', name), 'utf-8')
}

// ── End-to-end pipeline test ──────────────────────────────────────────────────

describe('Integration: full analysis pipeline', () => {
  it('demo-session.jsonl: parses to a valid ParsedSession', () => {
    const content = loadFixture('demo-session.jsonl')
    const session = parseJSONLString(content)

    expect(session.meta.sessionId).toBe('sess_demo')
    expect(session.messages.length).toBeGreaterThan(0)
    expect(session.toolCalls.length).toBeGreaterThan(0)
    expect(session.tokenTimeline.totalInput).toBeGreaterThan(0)
  })

  it('demo-session.jsonl: retry detector finds retry loops', () => {
    const session = parseJSONLString(loadFixture('demo-session.jsonl'))
    const result = detectRetryLoops(session)

    // demo-session has 3 identical Bash calls — should be detected
    expect(result.metrics['loop_count']).toBeGreaterThanOrEqual(1)
    expect(result.score).toBeLessThan(100)
  })

  it('demo-session.jsonl: reread calculator finds redundant reads', () => {
    const session = parseJSONLString(loadFixture('demo-session.jsonl'))
    const result = calculateReReadCost(session)

    // /src/app.ts is read 3 times in demo
    expect(result.metrics['redundant_read_tokens']).toBeGreaterThan(0)
  })

  it('demo-session.jsonl: SQI score is computed (0–100)', () => {
    const session = parseJSONLString(loadFixture('demo-session.jsonl'))
    const claudeMd = loadFixture('sample-claude-md.md')
    const rules = extractRules(claudeMd)

    const compliance = checkCompliance(session, rules)
    const retry = detectRetryLoops(session)
    const deadzone = mapDeadZones(rules, compliance)
    const reread = calculateReReadCost(session)
    const waste = classifyWaste(session, retry, reread)

    const sqi = calculateSQI([compliance, retry, deadzone, reread, waste])
    expect(sqi.overall).toBeGreaterThanOrEqual(0)
    expect(sqi.overall).toBeLessThanOrEqual(100)
    expect(['good', 'average', 'critical']).toContain(sqi.rating)
  })

  it('demo-session.jsonl: SQI score drops below 80 (has known issues)', () => {
    const session = parseJSONLString(loadFixture('demo-session.jsonl'))
    const rules = extractRules(loadFixture('sample-claude-md.md'))

    const compliance = checkCompliance(session, rules)
    const retry = detectRetryLoops(session)
    const deadzone = mapDeadZones(rules, compliance)
    const reread = calculateReReadCost(session)
    const waste = classifyWaste(session, retry, reread)

    const sqi = calculateSQI([compliance, retry, deadzone, reread, waste])
    // demo-session has retry loops and reread overhead — should not score "good"
    expect(sqi.overall).toBeLessThan(80)
  })

  it('retry-session.jsonl: detects multiple retry loops', () => {
    const session = parseJSONLString(loadFixture('retry-session.jsonl'))
    const result = detectRetryLoops(session)
    expect(result.findings.length).toBeGreaterThanOrEqual(1)
  })

  it('full pipeline: exportJSON produces valid JSON', () => {
    const session = parseJSONLString(loadFixture('demo-session.jsonl'))
    const rules = extractRules(loadFixture('sample-claude-md.md'))

    const compliance = checkCompliance(session, rules)
    const retry = detectRetryLoops(session)
    const deadzone = mapDeadZones(rules, compliance)
    const reread = calculateReReadCost(session)
    const waste = classifyWaste(session, retry, reread)
    const allResults = [compliance, retry, deadzone, reread, waste]

    const sqi = calculateSQI(allResults)
    const anomalies = tagAnomalies(sqi, allResults)
    const recs = generateRecommendations(sqi, anomalies)
    const finalSqi = { ...sqi, anomalies, recommendations: recs }

    const json = exportJSON(finalSqi, session)
    const parsed = JSON.parse(json) as Record<string, unknown>
    expect(parsed['version']).toBe('1')
    expect(parsed['session']).toBeDefined()
    expect(parsed['sqi']).toBeDefined()
  })
})
