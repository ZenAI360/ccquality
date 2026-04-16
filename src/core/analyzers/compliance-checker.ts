import type { ParsedSession } from '@/types/session'
import type { ExtractedRule } from '@/types/rules'
import type { AnalysisResult, Finding, Recommendation } from '@/types/analysis'

// ── Heuristic matchers ────────────────────────────────────────────────────────

/** Patterns that suggest a rule is verifiable from session output. */
const CONSOLE_LOG_RE = /console\.log\b/u
const JS_FILE_RE = /\.js['"`]/u
const TEST_FILE_RE = /\.(test|spec)\.(ts|tsx|js|jsx)/u

/** Rule text keywords that indicate a rule is not mechanically verifiable. */
const UNVERIFIABLE_KEYWORDS = [
  'understand', 'think', 'consider', 'reasonable', 'appropriate',
  'as needed', 'when necessary', 'judgment', 'context',
]

/**
 * Returns true if the rule cannot be checked programmatically.
 */
function isUnverifiable(rule: ExtractedRule): boolean {
  const lower = rule.text.toLowerCase()
  return UNVERIFIABLE_KEYWORDS.some((kw) => lower.includes(kw))
}

/**
 * Collects all assistant text output across the session.
 */
function assistantText(session: ParsedSession): string {
  return session.messages
    .filter((m) => m.role === 'assistant')
    .map((m) => m.textContent)
    .join('\n')
}

/**
 * Collects all file paths that appear as Write/Edit tool calls.
 */
function writtenFilePaths(session: ParsedSession): string[] {
  return session.toolCalls
    .filter((tc) => tc.name === 'Write' || tc.name === 'Edit')
    .map((tc) => tc.filePath ?? '')
    .filter((p) => p.length > 0)
}

// ── Violation detectors ───────────────────────────────────────────────────────

interface ViolationEvidence {
  violated: boolean
  evidence: string | undefined
  turnRange: [number, number] | undefined
}

/**
 * Checks a single rule against the session and returns violation evidence.
 */
function detectViolation(
  rule: ExtractedRule,
  session: ParsedSession,
  allAssistantText: string,
  writtenPaths: string[],
): ViolationEvidence {
  const lower = rule.text.toLowerCase()

  // "never use console.log" / "console.log YASAK"
  if (lower.includes('console.log') || lower.includes('console')) {
    if (CONSOLE_LOG_RE.test(allAssistantText)) {
      return { violated: true, evidence: 'console.log found in assistant output', turnRange: undefined }
    }
  }

  // "use typescript" / ".ts" — detect .js files being created
  if ((lower.includes('typescript') || lower.includes('.ts')) && !lower.includes('.json')) {
    const jsFiles = writtenPaths.filter((p) => JS_FILE_RE.test(p))
    if (jsFiles.length > 0) {
      return {
        violated: true,
        evidence: `JavaScript files written: ${jsFiles.slice(0, 3).join(', ')}`,
        turnRange: undefined,
      }
    }
  }

  // "always write tests" / "test" related rules
  if (
    (lower.includes('always') || lower.includes('her')) &&
    lower.includes('test')
  ) {
    const hasTestFile = writtenPaths.some((p) => TEST_FILE_RE.test(p))
    const hasToolCalls = session.toolCalls.length > 0
    if (hasToolCalls && !hasTestFile) {
      return {
        violated: true,
        evidence: 'No test file (.test.ts) created during session',
        turnRange: [0, session.meta.totalTurns - 1],
      }
    }
  }

  // "single file max N lines" / "max 300 lines" — can't verify without seeing file contents
  // These are unverifiable from session text alone
  if (lower.includes('max') && (lower.includes('lines') || lower.includes('satır'))) {
    return { violated: false, evidence: undefined, turnRange: undefined }
  }

  return { violated: false, evidence: undefined, turnRange: undefined }
}

// ── Rule check loop ───────────────────────────────────────────────────────────

interface RuleCheckSummary {
  findings: Finding[]
  verifiableCount: number
  violationCount: number
  unverifiableCount: number
}

/**
 * Iterates over all rules and collects violations.
 * Unverifiable rules are counted but do not produce findings.
 */
function runRuleChecks(
  rules: ExtractedRule[],
  session: ParsedSession,
  allAssistantText: string,
  writtenPaths: string[],
): RuleCheckSummary {
  const findings: Finding[] = []
  let verifiableCount = 0
  let violationCount = 0
  let unverifiableCount = 0

  for (const rule of rules) {
    if (isUnverifiable(rule)) { unverifiableCount++; continue }
    verifiableCount++
    const ev = detectViolation(rule, session, allAssistantText, writtenPaths)
    if (ev.violated) {
      violationCount++
      findings.push({
        id: `compliance-${String(findings.length + 1).padStart(3, '0')}`,
        severity: rule.category === 'testing' ? 'critical' : 'warn',
        title: `Rule violated: ${rule.text.slice(0, 60)}`,
        description: `CLAUDE.md rule at line ${String(rule.lineNumber)} was not followed.`,
        turnRange: ev.turnRange,
        tokenImpact: 0,
        evidence: ev.evidence,
      })
    }
  }

  return { findings, verifiableCount, violationCount, unverifiableCount }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Checks a parsed session for CLAUDE.md rule compliance.
 *
 * For each rule, heuristics determine whether a violation is detectable
 * from session output (tool calls and assistant text). Rules that cannot
 * be verified programmatically are counted but not penalised.
 *
 * @param session - Parsed session to evaluate
 * @param rules - Rules extracted from CLAUDE.md
 * @returns AnalysisResult with compliance score, findings, and recommendations
 */
export function checkCompliance(
  session: ParsedSession,
  rules: ExtractedRule[],
): AnalysisResult {
  if (rules.length === 0) {
    return {
      engineName: 'compliance',
      score: 100,
      findings: [],
      metrics: { total_rules: 0, violations: 0, unverifiable: 0 },
      recommendations: [],
    }
  }

  const { findings, verifiableCount, violationCount, unverifiableCount } = runRuleChecks(
    rules, session, assistantText(session), writtenFilePaths(session),
  )

  const score = verifiableCount === 0
    ? 100
    : Math.round(((verifiableCount - violationCount) / verifiableCount) * 100)

  const recommendations: Recommendation[] = []
  if (violationCount > 0) {
    recommendations.push({
      id: 'rec-compliance-001',
      priority: violationCount > 3 ? 'critical' : 'high',
      action: 'Review and fix CLAUDE.md rule violations',
      detail: `${String(violationCount)} verifiable rule(s) were broken in this session. Address findings before the next session.`,
      relatedFindings: findings.map((f) => f.id),
    })
  }

  return {
    engineName: 'compliance',
    score,
    findings,
    metrics: { total_rules: rules.length, verifiable: verifiableCount, violations: violationCount, unverifiable: unverifiableCount },
    recommendations,
  }
}
