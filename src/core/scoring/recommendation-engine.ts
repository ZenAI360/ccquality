import type { AnalysisResult, Recommendation, RecommendationPriority } from '@/types/analysis'
import type { Anomaly, SQIResult } from '@/types/scoring'

type RecTemplate = Omit<Recommendation, 'id'>

/**
 * Generates targeted recommendations for retry_waste anomalies.
 * Splits findings into two categories:
 *   - consecutive tool loops (Read/Edit called N+ times in a row)
 *   - error repeats (same error message recurring)
 * Each category gets a specific, actionable recommendation.
 */
function retryRecommendations(
  anomaly: Anomaly,
  retryResult: AnalysisResult | undefined,
): RecTemplate[] {
  const priority: RecommendationPriority =
    anomaly.severity === 'critical' ? 'critical' : 'high'

  if (!retryResult || retryResult.findings.length === 0) {
    return [
      {
        priority,
        action: 'Eliminate retry loops',
        detail:
          'Add explicit error-handling so the model does not loop on the same failed action. Provide clearer instructions upfront.',
        relatedFindings: [],
        slug: 'retry_waste',
      },
    ]
  }

  const recs: RecTemplate[] = []
  const findings = retryResult.findings

  // Category 1: consecutive identical tool calls (Read, Edit, Bash, etc.)
  const loopFindings = findings.filter(
    (f) => f.evidence !== undefined && !f.evidence.includes('error-repeat'),
  )

  // Category 2: same error message repeating
  const errorRepeatFindings = findings.filter(
    (f) => f.evidence?.includes('error-repeat') === true,
  )

  if (loopFindings.length > 0) {
    // Extract tool names to name the recommendation specifically
    const toolNames = [
      ...new Set(
        loopFindings
          .map((f) => f.evidence?.split(' ')[0] ?? '')
          .filter((n) => n.length > 0),
      ),
    ]
    const toolStr = toolNames.join('/') || 'tool'
    recs.push({
      priority,
      action: `Verify result after each ${toolStr} call`,
      detail: `${String(loopFindings.length)} consecutive-call loop(s) found. After each ${toolStr} invocation, check the result before calling again. Store file contents in memory variables to avoid re-reading the same file on subsequent turns.`,
      relatedFindings: loopFindings.map((f) => f.id),
      slug: 'consecutive_tool_loop',
    })
  }

  if (errorRepeatFindings.length > 0) {
    recs.push({
      priority: priority === 'critical' ? 'high' : priority,
      action: 'Change strategy when the same error recurs',
      detail: `${String(errorRepeatFindings.length)} repeated-error event(s) detected. When the same error appears again, try a different approach instead of repeating the same failed action. Add error classification to the CLAUDE.md rules.`,
      relatedFindings: errorRepeatFindings.map((f) => f.id),
      slug: 'error_repeat_loop',
    })
  }

  return recs
}

/**
 * Builds recommendation templates from an anomaly.
 */
function anomalyToTemplates(
  anomaly: Anomaly,
  allResults: AnalysisResult[],
): RecTemplate[] {
  if (anomaly.type === 'retry_waste') {
    const retryResult = allResults.find((r) => r.engineName === 'retryDetector')
    return retryRecommendations(anomaly, retryResult)
  }

  const priority: RecommendationPriority =
    anomaly.severity === 'critical' ? 'critical'
    : anomaly.severity === 'warn' ? 'high'
    : 'medium'

  const actionMap: Partial<Record<Anomaly['type'], { action: string; detail: string; slug: string }>> = {
    reread_overhead: {
      action: 'Cache file contents after first read',
      detail:
        'Store file content in a variable or memory note after the first Read. Avoid re-reading the same file multiple times, especially temp/output files that are polled repeatedly.',
      slug: 'reread_overhead',
    },
    low_compliance: {
      action: 'Review CLAUDE.md rule violations',
      detail:
        'Several rules in CLAUDE.md were broken during this session. Address compliance issues before the next session.',
      slug: 'low_compliance',
    },
    cache_miss: {
      action: 'Improve prompt cache utilisation',
      detail:
        'Most input tokens are not being served from cache. Structure prompts to reuse consistent prefixes across turns.',
      slug: 'cache_miss',
    },
    attention_dead_zone: {
      action: 'Move ignored rules to the top of CLAUDE.md',
      detail:
        'Rules buried in the middle of CLAUDE.md tend to be ignored. Place the most important rules in the first 20% of the file.',
      slug: 'attention_dead_zone',
    },
    token_spike: {
      action: 'Investigate large token spikes',
      detail:
        'One or more turns consumed significantly more tokens than average. Inspect those turns for runaway context or large tool results.',
      slug: 'token_spike',
    },
  }

  const mapped = actionMap[anomaly.type]
  if (!mapped) return []

  return [{ priority, action: mapped.action, detail: mapped.detail, relatedFindings: [], slug: mapped.slug }]
}

/**
 * Generates prioritised recommendations from the SQI result, anomaly list,
 * and raw analysis results.
 *
 * The retry_waste anomaly is split into category-specific recommendations:
 *   - consecutive tool loops → "Verify result after each tool call"
 *   - error repeats → "Change strategy when the same error recurs"
 *
 * IDs are assigned sequentially inside this function — no module-level state.
 *
 * @param sqi - The computed SQI result
 * @param anomalies - Tagged anomalies from anomaly-tagger
 * @param allResults - Raw engine results (used for targeted retry recommendations)
 * @returns Sorted recommendation list (critical first)
 */
export function generateRecommendations(
  sqi: SQIResult,
  anomalies: Anomaly[],
  allResults: AnalysisResult[] = [],
): Recommendation[] {
  const templates: RecTemplate[] = anomalies.flatMap((a) => anomalyToTemplates(a, allResults))

  // Generic low-score recommendation if no anomaly explains it
  if (sqi.overall < 50 && templates.length === 0) {
    templates.push({
      priority: 'high',
      action: 'Conduct a session quality review',
      detail: `Overall SQI is ${String(sqi.overall)}/100. Review the full session for patterns that reduce quality.`,
      relatedFindings: [],
      slug: 'low_score',
    })
  }

  // Sort: critical → high → medium → low
  const order: Record<RecommendationPriority, number> = { critical: 0, high: 1, medium: 2, low: 3 }
  templates.sort((a, b) => order[a.priority] - order[b.priority])

  // Assign sequential IDs after sorting (no module-level state)
  return templates.map((t, i) => ({
    ...t,
    id: `rec-${String(i + 1).padStart(3, '0')}`,
  }))
}
