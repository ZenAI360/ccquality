import { useEffect } from 'react'
import type { ParsedSession } from '@/types/session'
import { useAnalysis } from '@/ui/hooks/useAnalysis'
import { useT } from '@/ui/context/LanguageContext'
import { SQIGauge } from '@/ui/components/SQIGauge'
import { SummaryCards } from '@/ui/components/SummaryCards'
import { TokenTimeline } from '@/ui/components/TokenTimeline'
import { AttentionHeatmap } from '@/ui/components/AttentionHeatmap'
import { WasteDonut } from '@/ui/components/WasteDonut'
import { ReReadTable } from '@/ui/components/ReReadTable'
import { FindingsPanel } from '@/ui/components/FindingsPanel'
import { RecommendationCards } from '@/ui/components/RecommendationCards'

interface DashboardPageProps {
  session: ParsedSession | undefined
  claudeMdContent: string | undefined
}

/**
 * Dashboard page: triggers analysis on mount (when session changes),
 * then renders all analysis components.
 */
export function DashboardPage({ session, claudeMdContent }: DashboardPageProps) {
  const t = useT()
  const { state, run } = useAnalysis()

  useEffect(() => {
    if (session) run(session, claudeMdContent)
  }, [session, claudeMdContent, run])

  if (!session) {
    return (
      <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '4rem' }}>
        {t.dashboard.noSession}
      </p>
    )
  }

  if (state.step === 'error') {
    return (
      <p
        role="alert"
        style={{
          color: '#e05252',
          background: 'rgba(224,82,82,0.1)',
          borderRadius: '0.4rem',
          padding: '1rem',
          maxWidth: '600px',
          margin: '2rem auto',
        }}
      >
        {t.dashboard.analysisError(state.error ?? '')}
      </p>
    )
  }

  if (state.step !== 'done') {
    const stepLabels = t.dashboard.step
    const stepLabel = (stepLabels as Record<string, string>)[state.step] ?? stepLabels.default
    return (
      <div
        aria-live="polite"
        aria-busy="true"
        style={{
          textAlign: 'center',
          marginTop: '4rem',
          color: 'var(--text-muted)',
          fontSize: '0.9rem',
        }}
      >
        <p style={{ color: 'var(--amber)', fontWeight: 600 }}>
          {stepLabel}
        </p>
        <p style={{ fontSize: '0.78rem' }}>{t.dashboard.processing}</p>
      </div>
    )
  }

  const { results, sqi, rules } = state
  const totalLines = claudeMdContent ? claudeMdContent.split('\n').length : 0
  const retryResult = results.find((r) => r.engineName === 'retryDetector')
  const rereadResult = results.find((r) => r.engineName === 'reReadCalculator')
  const complianceResult = results.find((r) => r.engineName === 'compliance')
  const deadzoneResult = results.find((r) => r.engineName === 'deadZoneMapper')
  const wasteResult = results.find((r) => r.engineName === 'wasteClassifier')

  const allFindings = results.flatMap((r) => r.findings)

  if (!sqi) return null

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
      }}
    >
      <h2 style={{ color: 'var(--amber)', margin: 0, fontSize: '1.25rem' }}>
        {t.dashboard.sessionTitle(session.meta.sessionId)}
      </h2>

      {/* Top row: gauge + summary cards + waste donut */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.25rem', alignItems: 'stretch' }}>
        <SQIGauge result={sqi} />
        <SummaryCards results={results} />
        {wasteResult ? <WasteDonut wasteResult={wasteResult} /> : <div />}
      </div>

      {/* Token timeline */}
      <TokenTimeline timeline={session.tokenTimeline} retryResult={retryResult} />

      {/* Heatmap – full width */}
      {complianceResult && deadzoneResult && (
        <AttentionHeatmap
          rules={rules}
          complianceResult={complianceResult}
          deadzoneResult={deadzoneResult}
          totalLines={totalLines}
        />
      )}

      {/* ReRead table */}
      {rereadResult && <ReReadTable findings={rereadResult.findings} />}

      {/* Findings + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        <FindingsPanel findings={allFindings} />
        <RecommendationCards recommendations={sqi.recommendations} />
      </div>
    </div>
  )
}
