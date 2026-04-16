/** Category of an extracted CLAUDE.md rule */
export type RuleCategory =
  | 'code-style'
  | 'testing'
  | 'naming'
  | 'architecture'
  | 'tooling'
  | 'other'

/**
 * Zone number 1–5, representing which fifth of the CLAUDE.md
 * the rule falls in (1 = top 20%, 5 = bottom 20%).
 */
export type RuleZone = 1 | 2 | 3 | 4 | 5

/** A single imperative rule parsed from a CLAUDE.md file */
export interface ExtractedRule {
  /** Unique stable ID, e.g. "rule-012" */
  id: string
  /** Full text of the rule */
  text: string
  /** 1-based line number in the source CLAUDE.md */
  lineNumber: number
  /** Which fifth of the document this rule lives in */
  zone: RuleZone
  category: RuleCategory
  /** Raw pattern match that identified this as a rule */
  matchedPattern: string
}
