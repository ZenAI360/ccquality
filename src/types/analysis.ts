/** Severity level for findings */
export type FindingSeverity = 'info' | 'warn' | 'critical'

/** A single discovered issue in a session */
export interface Finding {
  /** Unique finding ID within the analysis result */
  id: string
  severity: FindingSeverity
  title: string
  description: string
  /** Inclusive turn range where this finding occurs */
  turnRange: [number, number] | undefined
  /** Estimated number of wasted tokens associated with this finding */
  tokenImpact: number
  /** Evidence snippet (e.g., repeated text, tool call input) */
  evidence: string | undefined
}

/** Priority of a recommendation */
export type RecommendationPriority = 'critical' | 'high' | 'medium' | 'low'

/** Actionable suggestion derived from findings */
export interface Recommendation {
  id: string
  priority: RecommendationPriority
  /** Short imperative action, e.g. "Move rule X to top of CLAUDE.md" */
  action: string
  /** Longer explanation of why and how */
  detail: string
  /** IDs of findings that triggered this recommendation */
  relatedFindings: string[]
  /** Anomaly type slug used for i18n lookup (e.g. "retry_waste") */
  slug?: string
}

/** Named analysis engine identifiers */
export type AnalysisEngineName =
  | 'compliance'
  | 'retryDetector'
  | 'deadZoneMapper'
  | 'reReadCalculator'
  | 'wasteClassifier'

/** Output of a single analysis engine */
export interface AnalysisResult {
  engineName: AnalysisEngineName
  /** Normalised 0–100 sub-score (higher = better) */
  score: number
  findings: Finding[]
  /** Engine-specific numeric metrics */
  metrics: Record<string, number>
  recommendations: Recommendation[]
}
