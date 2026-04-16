import type { AnalysisResult } from '@/types/analysis'
import type { Anomaly, SQIResult } from '@/types/scoring'

// ── Thresholds ────────────────────────────────────────────────────────────────

const RETRY_WASTE_CRITICAL_PCT = 15
const RETRY_WASTE_WARN_PCT = 5
const REREAD_OVERHEAD_CRITICAL_PCT = 500
const REREAD_OVERHEAD_WARN_PCT = 100
const COMPLIANCE_CRITICAL_SCORE = 40
const COMPLIANCE_WARN_SCORE = 60
const CACHE_MISS_WARN_PCT = 80

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Reads a numeric metric from an AnalysisResult, returning 0 if absent.
 */
function metric(result: AnalysisResult, key: string): number {
  return typeof result.metrics[key] === 'number' ? (result.metrics[key] ?? 0) : 0
}

type AnomalyTemplate = Omit<Anomaly, 'id'>

/**
 * Tags retry waste anomaly from the retryDetector result.
 */
function tagRetryWaste(retryResult: AnalysisResult): AnomalyTemplate[] {
  const retryWaste = metric(retryResult, 'retry_waste')
  if (retryWaste > RETRY_WASTE_CRITICAL_PCT) {
    return [{
      type: 'retry_waste',
      severity: 'critical',
      description: `Retry waste ${String(retryWaste)}% exceeds critical threshold (${String(RETRY_WASTE_CRITICAL_PCT)}%)`,
      turnRange: undefined,
      tokenCost: metric(retryResult, 'waste_tokens'),
    }]
  }
  if (retryWaste > RETRY_WASTE_WARN_PCT) {
    return [{
      type: 'retry_waste',
      severity: 'warn',
      description: `Retry waste ${String(retryWaste)}% exceeds warning threshold (${String(RETRY_WASTE_WARN_PCT)}%)`,
      turnRange: undefined,
      tokenCost: metric(retryResult, 'waste_tokens'),
    }]
  }
  return []
}

/**
 * Tags re-read overhead anomaly from the reReadCalculator result.
 */
function tagRereadOverhead(rereadResult: AnalysisResult): AnomalyTemplate[] {
  const overhead = metric(rereadResult, 'reread_overhead')
  if (overhead > REREAD_OVERHEAD_CRITICAL_PCT) {
    return [{
      type: 'reread_overhead',
      severity: 'critical',
      description: `Re-read overhead ${String(overhead)}% exceeds critical threshold (${String(REREAD_OVERHEAD_CRITICAL_PCT)}%)`,
      turnRange: undefined,
      tokenCost: metric(rereadResult, 'redundant_read_tokens'),
    }]
  }
  if (overhead > REREAD_OVERHEAD_WARN_PCT) {
    return [{
      type: 'reread_overhead',
      severity: 'warn',
      description: `Re-read overhead ${String(overhead)}% exceeds warning threshold (${String(REREAD_OVERHEAD_WARN_PCT)}%)`,
      turnRange: undefined,
      tokenCost: metric(rereadResult, 'redundant_read_tokens'),
    }]
  }
  return []
}

/**
 * Tags compliance anomaly from the SQI breakdown.
 */
function tagLowCompliance(sqi: SQIResult): AnomalyTemplate[] {
  const score = sqi.breakdown.compliance
  if (score < COMPLIANCE_CRITICAL_SCORE) {
    return [{
      type: 'low_compliance',
      severity: 'critical',
      description: `Compliance score ${String(score)} is critically low (< ${String(COMPLIANCE_CRITICAL_SCORE)})`,
      turnRange: undefined,
      tokenCost: 0,
    }]
  }
  if (score < COMPLIANCE_WARN_SCORE) {
    return [{
      type: 'low_compliance',
      severity: 'warn',
      description: `Compliance score ${String(score)} is below threshold (${String(COMPLIANCE_WARN_SCORE)})`,
      turnRange: undefined,
      tokenCost: 0,
    }]
  }
  return []
}

/**
 * Tags cache miss anomaly from the wasteClassifier result.
 */
function tagCacheMiss(wasteResult: AnalysisResult): AnomalyTemplate[] {
  const totalTokens = metric(wasteResult, 'total_tokens')
  if (totalTokens === 0) return []
  const cacheMiss = metric(wasteResult, 'CacheMiss')
  const missRate = (cacheMiss / totalTokens) * 100
  if (missRate > CACHE_MISS_WARN_PCT) {
    return [{
      type: 'cache_miss',
      severity: 'warn',
      description: `Cache miss rate ${String(Math.round(missRate))}% is high (> ${String(CACHE_MISS_WARN_PCT)}%)`,
      turnRange: undefined,
      tokenCost: cacheMiss,
    }]
  }
  return []
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Tags statistically notable anomalies from the SQI result and engine outputs.
 *
 * Severity rules applied:
 * - retry_waste > 15% → critical
 * - retry_waste > 5%  → warn
 * - reread_overhead > 500% → critical
 * - reread_overhead > 100% → warn
 * - compliance < 40  → critical
 * - compliance < 60  → warn
 * - cache miss rate > 80% → warn
 *
 * @param sqi - SQI result (used for compliance sub-score)
 * @param results - Raw engine results for metric access
 * @returns Array of tagged anomalies with sequential IDs
 */
export function tagAnomalies(sqi: SQIResult, results: AnalysisResult[]): Anomaly[] {
  const retryResult = results.find((r) => r.engineName === 'retryDetector')
  const rereadResult = results.find((r) => r.engineName === 'reReadCalculator')
  const wasteResult = results.find((r) => r.engineName === 'wasteClassifier')

  const templates: AnomalyTemplate[] = [
    ...(retryResult ? tagRetryWaste(retryResult) : []),
    ...(rereadResult ? tagRereadOverhead(rereadResult) : []),
    ...tagLowCompliance(sqi),
    ...(wasteResult ? tagCacheMiss(wasteResult) : []),
  ]

  return templates.map((t, i) => ({
    ...t,
    id: `anomaly-${String(i + 1).padStart(3, '0')}`,
  }))
}
