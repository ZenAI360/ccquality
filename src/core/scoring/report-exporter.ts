import type { ParsedSession } from '@/types/session'
import type { SQIResult } from '@/types/scoring'

/**
 * Shape of the exported JSON report.
 * Versioned so consumers can detect schema changes.
 */
interface ExportedReport {
  version: '1'
  exportedAt: string
  session: {
    sessionId: string
    projectName: string | undefined
    branch: string | undefined
    startTime: string | undefined
    endTime: string | undefined
    totalTurns: number
    totalInputTokens: number
    totalOutputTokens: number
    cacheHitRatio: number
  }
  sqi: {
    overall: number
    rating: string
    breakdown: Record<string, number>
  }
  anomalies: Array<{
    id: string
    type: string
    severity: string
    description: string
    tokenCost: number
  }>
  recommendations: Array<{
    id: string
    priority: string
    action: string
    detail: string
  }>
}

/**
 * Serialises an SQI result and session metadata to JSON.
 *
 * The output matches the schema defined in docs/report-schema.json.
 *
 * @param sqi - Fully computed SQIResult (with anomalies + recommendations)
 * @param session - Parsed session for metadata
 * @returns Pretty-printed JSON string
 */
export function exportJSON(sqi: SQIResult, session: ParsedSession): string {
  const report: ExportedReport = {
    version: '1',
    exportedAt: new Date().toISOString(),
    session: {
      sessionId: session.meta.sessionId,
      projectName: session.meta.projectName,
      branch: session.meta.branch,
      startTime: session.meta.startTime,
      endTime: session.meta.endTime,
      totalTurns: session.meta.totalTurns,
      totalInputTokens: session.tokenTimeline.totalInput,
      totalOutputTokens: session.tokenTimeline.totalOutput,
      cacheHitRatio: session.tokenTimeline.cacheHitRatio,
    },
    sqi: {
      overall: sqi.overall,
      rating: sqi.rating,
      breakdown: { ...sqi.breakdown },
    },
    anomalies: sqi.anomalies.map((a) => ({
      id: a.id,
      type: a.type,
      severity: a.severity,
      description: a.description,
      tokenCost: a.tokenCost,
    })),
    recommendations: sqi.recommendations.map((r) => ({
      id: r.id,
      priority: r.priority,
      action: r.action,
      detail: r.detail,
    })),
  }

  return JSON.stringify(report, null, 2)
}
