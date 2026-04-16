import type { AnalysisResult } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface SummaryCardsProps {
  results: AnalysisResult[]
}

interface CardData {
  label: string
  value: string
  unit: string
  status: 'good' | 'warn' | 'critical'
  description: string
  tooltip: string
}

function statusColor(status: CardData['status']): string {
  if (status === 'good') return '#4ac6d2'
  if (status === 'warn') return '#f0a830'
  return '#e05252'
}

function getMetric(results: AnalysisResult[], engine: string, key: string): number {
  const r = results.find((x) => x.engineName === engine)
  return typeof r?.metrics[key] === 'number' ? (r.metrics[key] ?? 0) : 0
}

function getScore(results: AnalysisResult[], engine: string): number {
  return results.find((x) => x.engineName === engine)?.score ?? 100
}

function scoreStatus(score: number): CardData['status'] {
  if (score >= 80) return 'good'
  if (score >= 50) return 'warn'
  return 'critical'
}

/**
 * Four summary cards showing key quality metrics at a glance.
 * Each card has an info icon that explains the metric on hover.
 */
export function SummaryCards({ results }: SummaryCardsProps) {
  const t = useT()
  const efficiency = getMetric(results, 'wasteClassifier', 'efficiency')
  const rereadOverhead = getMetric(results, 'reReadCalculator', 'reread_overhead')
  const loopCount = getMetric(results, 'retryDetector', 'loop_count')
  const complianceScore = getScore(results, 'compliance')

  const cards: CardData[] = [
    {
      label: t.summaryCards.efficiency.label,
      value: String(efficiency),
      unit: '%',
      status: efficiency >= 70 ? 'good' : efficiency >= 40 ? 'warn' : 'critical',
      description: t.summaryCards.efficiency.description,
      tooltip: t.summaryCards.efficiency.tooltip,
    },
    {
      label: t.summaryCards.reread.label,
      value: String(Math.round(rereadOverhead)),
      unit: '%',
      status: rereadOverhead <= 50 ? 'good' : rereadOverhead <= 200 ? 'warn' : 'critical',
      description: t.summaryCards.reread.description,
      tooltip: t.summaryCards.reread.tooltip,
    },
    {
      label: t.summaryCards.retry.label,
      value: String(loopCount),
      unit: t.summaryCards.retry.unit,
      status: loopCount === 0 ? 'good' : loopCount <= 2 ? 'warn' : 'critical',
      description: t.summaryCards.retry.description,
      tooltip: t.summaryCards.retry.tooltip,
    },
    {
      label: t.summaryCards.compliance.label,
      value: String(complianceScore),
      unit: '/100',
      status: scoreStatus(complianceScore),
      description: t.summaryCards.compliance.description,
      tooltip: t.summaryCards.compliance.tooltip,
    },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '0.75rem',
      }}
    >
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: '0.6rem',
            padding: '1.1rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '0.4rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {card.label}
            </span>
            <InfoIcon text={card.tooltip} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
            <span
              style={{ fontSize: '2.4rem', fontWeight: 700, color: statusColor(card.status), lineHeight: 1 }}
              aria-label={`${card.label}: ${card.value}${card.unit}`}
            >
              {card.value}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{card.unit}</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{card.description}</span>
        </div>
      ))}
    </div>
  )
}
