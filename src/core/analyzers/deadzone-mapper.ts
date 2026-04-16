import type { ExtractedRule } from '@/types/rules'
import type { AnalysisResult, Finding, Recommendation } from '@/types/analysis'

/** Minimum zone compliance rate below which a dead zone warning is emitted. */
const DEAD_ZONE_WARN_THRESHOLD = 0.7

/** Compliance rate below which a dead zone is flagged as critical. */
const DEAD_ZONE_CRITICAL_THRESHOLD = 0.4

/**
 * Minimum gap between middle-zone average and edge-zone average that
 * triggers a "lost in the middle" warning.
 */
const DEAD_ZONE_MIDDLE_GAP = 0.15

/** Compliance data per rule zone. */
interface ZoneStats {
  zone: number
  total: number
  violated: number
  complianceRate: number
}

/**
 * Groups rules by zone and merges in violations from complianceResult findings.
 *
 * A rule is considered violated if a finding title contains the rule's text
 * (first 40 characters are compared for robustness).
 */
function buildZoneStats(
  rules: ExtractedRule[],
  violatedRuleTexts: Set<string>,
): ZoneStats[] {
  const zoneMap = new Map<number, { total: number; violated: number }>()

  for (let z = 1; z <= 5; z++) {
    zoneMap.set(z, { total: 0, violated: 0 })
  }

  for (const rule of rules) {
    const entry = zoneMap.get(rule.zone)
    if (!entry) continue
    entry.total++
    const prefix = rule.text.slice(0, 40).toLowerCase()
    if (violatedRuleTexts.has(prefix)) entry.violated++
  }

  const stats: ZoneStats[] = []
  for (const [zone, { total, violated }] of zoneMap) {
    const complianceRate = total === 0 ? 1 : (total - violated) / total
    stats.push({ zone, total, violated, complianceRate })
  }
  stats.sort((a, b) => a.zone - b.zone)
  return stats
}

/**
 * Maps attention dead zones in a CLAUDE.md by analysing per-zone rule compliance.
 *
 * The document is divided into 5 equal zones. Zones with lower compliance rates
 * are flagged as dead zones. "Lost in the middle" is detected when the middle
 * zones (2-4) have worse compliance than the edge zones (1 and 5).
 *
 * @param rules - All rules extracted from CLAUDE.md
 * @param complianceResult - Output from checkCompliance
 * @returns AnalysisResult with dead zone findings and dead_zone_ratio metric
 */
export function mapDeadZones(
  rules: ExtractedRule[],
  complianceResult: AnalysisResult,
): AnalysisResult {
  if (rules.length === 0) {
    return {
      engineName: 'deadZoneMapper',
      score: 100,
      findings: [],
      metrics: { dead_zone_ratio: 0, worst_zone: 0, best_zone: 0 },
      recommendations: [],
    }
  }

  // Build a set of violated-rule prefixes from compliance findings
  const violatedPrefixes = new Set<string>()
  for (const finding of complianceResult.findings) {
    const match = /^Rule violated:\s*(.+)$/u.exec(finding.title)
    if (match?.[1]) {
      violatedPrefixes.add(match[1].slice(0, 40).toLowerCase())
    }
  }

  const stats = buildZoneStats(rules, violatedPrefixes)
  const populatedStats = stats.filter((s) => s.total > 0)

  if (populatedStats.length === 0) {
    return {
      engineName: 'deadZoneMapper',
      score: 100,
      findings: [],
      metrics: { dead_zone_ratio: 0, worst_zone: 0, best_zone: 0 },
      recommendations: [],
    }
  }

  const worstZone = populatedStats.reduce((a, b) =>
    a.complianceRate < b.complianceRate ? a : b,
  )
  const bestZone = populatedStats.reduce((a, b) =>
    a.complianceRate > b.complianceRate ? a : b,
  )

  const deadZoneRatio =
    bestZone.complianceRate > 0
      ? (1 - worstZone.complianceRate) / bestZone.complianceRate
      : 0

  const findings: Finding[] = []

  if (worstZone.complianceRate < DEAD_ZONE_WARN_THRESHOLD) {
    const pct = Math.round(worstZone.complianceRate * 100)
    findings.push({
      id: 'deadzone-001',
      severity: worstZone.complianceRate < DEAD_ZONE_CRITICAL_THRESHOLD ? 'critical' : 'warn',
      title: `Dead zone in CLAUDE.md zone ${String(worstZone.zone)}`,
      description: `Zone ${String(worstZone.zone)} has only ${String(pct)}% compliance.`,
      turnRange: undefined,
      tokenImpact: 0,
      evidence: `${String(worstZone.violated)}/${String(worstZone.total)} rules violated in zone ${String(worstZone.zone)}`,
    })
  }

  // "Lost in the middle" detection
  const edgeStats = populatedStats.filter((s) => s.zone === 1 || s.zone === 5)
  const middleStats = populatedStats.filter((s) => s.zone >= 2 && s.zone <= 4)
  if (edgeStats.length > 0 && middleStats.length > 0) {
    const avgEdge =
      edgeStats.reduce((sum, s) => sum + s.complianceRate, 0) / edgeStats.length
    const avgMiddle =
      middleStats.reduce((sum, s) => sum + s.complianceRate, 0) / middleStats.length
    if (avgMiddle < avgEdge - DEAD_ZONE_MIDDLE_GAP) {
      findings.push({
        id: 'deadzone-002',
        severity: 'warn',
        title: '"Lost in the middle" pattern detected',
        description: 'Rules in the middle sections of CLAUDE.md have lower compliance than edge sections.',
        turnRange: undefined,
        tokenImpact: 0,
        evidence: `Middle avg ${String(Math.round(avgMiddle * 100))}% vs edge avg ${String(Math.round(avgEdge * 100))}%`,
      })
    }
  }

  const avgCompliance =
    populatedStats.reduce((sum, s) => sum + s.complianceRate, 0) / populatedStats.length
  const score = Math.round(avgCompliance * 100)

  const recommendations: Recommendation[] = []
  if (findings.length > 0) {
    const worstStart = worstZone.zone * 20 - 19
    recommendations.push({
      id: 'rec-deadzone-001',
      priority: worstZone.complianceRate < DEAD_ZONE_CRITICAL_THRESHOLD ? 'critical' : 'high',
      action: `Move rules from zone ${String(worstZone.zone)} toward the top of CLAUDE.md`,
      detail: `Rules in the ${String(worstStart)}-${String(worstZone.zone * 20)}% band are frequently ignored. Move them earlier to improve attention.`,
      relatedFindings: findings.map((f) => f.id),
    })
  }

  return {
    engineName: 'deadZoneMapper',
    score,
    findings,
    metrics: {
      dead_zone_ratio: Math.round(deadZoneRatio * 100) / 100,
      worst_zone: worstZone.zone,
      best_zone: bestZone.zone,
    },
    recommendations,
  }
}
