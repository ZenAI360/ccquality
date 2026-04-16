import type { AnalysisResult } from '@/types/analysis'
import type { SQIBreakdown, SQIResult } from '@/types/scoring'

/** Minimum loop count that triggers the severe-retry multiplicative SQI penalty. */
const SEVERE_LOOP_COUNT_THRESHOLD = 10

/** Minimum retry waste percentage that triggers the severe-retry SQI penalty. */
const SEVERE_WASTE_PCT_THRESHOLD = 20

/** Multiplicative SQI penalty factor applied when severe retry conditions are met. */
const SEVERE_RETRY_SQI_PENALTY = 0.85

/** Weights for each analysis engine sub-score (must sum to 1.0). */
const WEIGHTS = {
  compliance: 0.25,
  readEfficiency: 0.25,
  retryEfficiency: 0.20,
  attentionDistribution: 0.15,
  tokenUtilisation: 0.15,
} as const

/**
 * Maps an AnalysisEngineName to its SQIBreakdown key.
 */
const ENGINE_TO_BREAKDOWN: Partial<Record<string, keyof SQIBreakdown>> = {
  compliance: 'compliance',
  reReadCalculator: 'readEfficiency',
  retryDetector: 'retryEfficiency',
  deadZoneMapper: 'attentionDistribution',
  wasteClassifier: 'tokenUtilisation',
}

/**
 * Derives the SQI rating label from the overall score.
 */
function toRating(score: number): 'good' | 'average' | 'critical' {
  if (score >= 80) return 'good'
  if (score >= 50) return 'average'
  return 'critical'
}

/**
 * Calculates the Session Quality Index from the five analysis engine results.
 *
 * Weights: compliance(0.25), readEfficiency(0.25), retryEfficiency(0.20),
 *          attentionDistribution(0.15), tokenUtilisation(0.15).
 *
 * @param analysisResults - Array of AnalysisResult from all engines
 * @returns SQIResult with overall score, breakdown, and rating
 */
export function calculateSQI(analysisResults: AnalysisResult[]): SQIResult {
  // Map engine name → score, default 100 if engine is missing
  const scoreMap = new Map<keyof SQIBreakdown, number>([
    ['compliance', 100],
    ['readEfficiency', 100],
    ['retryEfficiency', 100],
    ['attentionDistribution', 100],
    ['tokenUtilisation', 100],
  ])

  for (const result of analysisResults) {
    const key = ENGINE_TO_BREAKDOWN[result.engineName]
    if (key) {
      scoreMap.set(key, Math.max(0, Math.min(100, result.score)))
    }
  }

  const breakdown: SQIBreakdown = {
    compliance: scoreMap.get('compliance') ?? 100,
    readEfficiency: scoreMap.get('readEfficiency') ?? 100,
    retryEfficiency: scoreMap.get('retryEfficiency') ?? 100,
    attentionDistribution: scoreMap.get('attentionDistribution') ?? 100,
    tokenUtilisation: scoreMap.get('tokenUtilisation') ?? 100,
  }

  const rawScore =
    breakdown.compliance * WEIGHTS.compliance +
    breakdown.readEfficiency * WEIGHTS.readEfficiency +
    breakdown.retryEfficiency * WEIGHTS.retryEfficiency +
    breakdown.attentionDistribution * WEIGHTS.attentionDistribution +
    breakdown.tokenUtilisation * WEIGHTS.tokenUtilisation

  // Multiplicative penalty for sessions with severe retry problems.
  // A high loop count or high waste fraction cannot be hidden by good scores elsewhere.
  const retryResult = analysisResults.find((r) => r.engineName === 'retryDetector')
  const loopCount = typeof retryResult?.metrics['loop_count'] === 'number'
    ? retryResult.metrics['loop_count']
    : 0
  const retryWastePct = typeof retryResult?.metrics['retry_waste'] === 'number'
    ? retryResult.metrics['retry_waste']
    : 0
  const penaltyFactor =
    loopCount > SEVERE_LOOP_COUNT_THRESHOLD || retryWastePct > SEVERE_WASTE_PCT_THRESHOLD
      ? SEVERE_RETRY_SQI_PENALTY
      : 1.0

  const overall = Math.round(Math.max(0, Math.min(100, rawScore * penaltyFactor)))

  return {
    overall,
    breakdown,
    anomalies: [],
    recommendations: [],
    rating: toRating(overall),
  }
}
