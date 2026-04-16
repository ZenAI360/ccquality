import { describe, it, expect } from 'vitest'
import { mapDeadZones } from '@/core/analyzers/deadzone-mapper'
import type { ExtractedRule } from '@/types/rules'
import type { AnalysisResult } from '@/types/analysis'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRule(
  text: string,
  zone: ExtractedRule['zone'],
  line = 1,
): ExtractedRule {
  return {
    id: `rule-${String(line).padStart(3, '0')}`,
    text,
    lineNumber: line,
    zone,
    category: 'code-style',
    matchedPattern: 'Never',
  }
}

function emptyCompliance(): AnalysisResult {
  return {
    engineName: 'compliance',
    score: 100,
    findings: [],
    metrics: {},
    recommendations: [],
  }
}

function complianceWithViolations(violatedTexts: string[]): AnalysisResult {
  return {
    engineName: 'compliance',
    score: 50,
    findings: violatedTexts.map((text, i) => ({
      id: `f-${String(i)}`,
      severity: 'warn' as const,
      title: `Rule violated: ${text}`,
      description: '',
      turnRange: undefined,
      tokenImpact: 0,
      evidence: undefined,
    })),
    metrics: {},
    recommendations: [],
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('mapDeadZones', () => {
  it('returns score 100 when no rules provided', () => {
    const result = mapDeadZones([], emptyCompliance())
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
  })

  it('returns score 100 when all zones have full compliance', () => {
    const rules: ExtractedRule[] = [
      makeRule('Never skip tests.', 1),
      makeRule('Always lint before push.', 3),
      makeRule('Use TypeScript.', 5),
    ]
    const result = mapDeadZones(rules, emptyCompliance())
    expect(result.score).toBe(100)
    expect(result.findings).toHaveLength(0)
  })

  it('flags worst zone when compliance falls below 70%', () => {
    // Zone 3 has 2 rules, both violated
    const rules: ExtractedRule[] = [
      makeRule('Never use any type.', 1),      // zone 1 — compliant
      makeRule('Always run eslint.', 3, 5),    // zone 3 — violated
      makeRule('Avoid global state.', 3, 6),   // zone 3 — violated
    ]
    const compliance = complianceWithViolations([
      'Always run eslint.',
      'Avoid global state.',
    ])
    const result = mapDeadZones(rules, compliance)
    expect(result.findings.some((f) => f.title.includes('Dead zone'))).toBe(true)
    expect(result.metrics['worst_zone']).toBe(3)
  })

  it('detects "lost in the middle" when middle zones are significantly worse', () => {
    // Zone 1 and 5 are perfect; zone 3 has violations
    const rules: ExtractedRule[] = [
      makeRule('Never use console.log.', 1, 1),       // zone 1
      makeRule('Always write tests.', 1, 2),          // zone 1
      makeRule('Avoid type casting.', 3, 5),          // zone 3
      makeRule('Never use any.', 3, 6),               // zone 3
      makeRule('Prefer composition.', 3, 7),          // zone 3
      makeRule('Use strict mode.', 5, 9),             // zone 5
      makeRule('Keep files under 300 lines.', 5, 10), // zone 5
    ]
    const compliance = complianceWithViolations([
      'Avoid type casting.',
      'Never use any.',
      'Prefer composition.',
    ])
    const result = mapDeadZones(rules, compliance)
    expect(result.findings.some((f) => f.title.includes('middle'))).toBe(true)
  })

  it('returns best_zone and worst_zone metrics', () => {
    const rules: ExtractedRule[] = [
      makeRule('Always lint.', 1),
      makeRule('Never skip tests.', 5),
    ]
    const compliance = complianceWithViolations(['Never skip tests.'])
    const result = mapDeadZones(rules, compliance)
    expect(result.metrics['best_zone']).toBe(1)
    expect(result.metrics['worst_zone']).toBe(5)
  })

  it('engineName is "deadZoneMapper"', () => {
    expect(mapDeadZones([], emptyCompliance()).engineName).toBe('deadZoneMapper')
  })
})
