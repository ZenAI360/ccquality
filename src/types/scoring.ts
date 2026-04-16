import type { Recommendation } from './analysis'

/** Severity of a detected anomaly */
export type AnomalySeverity = 'info' | 'warn' | 'critical'

/** Type identifier for anomaly categories */
export type AnomalyType =
  | 'retry_waste'
  | 'reread_overhead'
  | 'low_compliance'
  | 'cache_miss'
  | 'attention_dead_zone'
  | 'token_spike'

/** A statistically notable anomaly in session behaviour */
export interface Anomaly {
  id: string
  type: AnomalyType
  severity: AnomalySeverity
  description: string
  turnRange: [number, number] | undefined
  /** Estimated token cost of this anomaly */
  tokenCost: number
}

/** Per-engine score breakdown (all 0–100, higher = better) */
export interface SQIBreakdown {
  /** Rule compliance sub-score (weight 0.25) */
  compliance: number
  /** Read efficiency sub-score (weight 0.25) */
  readEfficiency: number
  /** Retry efficiency sub-score (weight 0.20) */
  retryEfficiency: number
  /** Attention distribution sub-score (weight 0.15) */
  attentionDistribution: number
  /** Token utilisation sub-score (weight 0.15) */
  tokenUtilisation: number
}

/** Final Session Quality Index result */
export interface SQIResult {
  /** Weighted composite score 0–100 */
  overall: number
  breakdown: SQIBreakdown
  anomalies: Anomaly[]
  recommendations: Recommendation[]
  /** Human-readable rating */
  rating: 'good' | 'average' | 'critical'
}
