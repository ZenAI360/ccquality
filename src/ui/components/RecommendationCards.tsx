import type { Recommendation, RecommendationPriority } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface RecommendationCardsProps {
  recommendations: Recommendation[]
}

const PRIORITY_COLOR: Record<RecommendationPriority, string> = {
  critical: '#e05252',
  high: '#f0a830',
  medium: '#4ac6d2',
  low: '#888',
}

/**
 * Cards listing actionable recommendations with priority badges and copy buttons.
 */
export function RecommendationCards({ recommendations }: RecommendationCardsProps) {
  const t = useT()

  if (recommendations.length === 0) {
    return (
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          color: 'var(--text-muted)',
          textAlign: 'center',
          fontSize: '0.875rem',
        }}
      >
        {t.recommendations.noData}
      </div>
    )
  }

  function resolveTexts(rec: Recommendation): { action: string; detail: string } {
    if (rec.slug) {
      const translated = t.recTexts[rec.slug]
      if (translated) return translated
    }
    return { action: rec.action, detail: rec.detail }
  }

  function copyText(rec: Recommendation) {
    const { action, detail } = resolveTexts(rec)
    void navigator.clipboard.writeText(`# ${action}\n${detail}`)
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem' }}>
          {t.recommendations.title(recommendations.length)}
        </h3>
        <InfoIcon text={t.recommendations.tooltip} width={260} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {recommendations.map((rec) => {
          const color = PRIORITY_COLOR[rec.priority]
          const priorityLabel = t.recommendations.priority[rec.priority] ?? rec.priority
          const { action, detail } = resolveTexts(rec)
          return (
            <div
              key={rec.id}
              style={{
                borderRadius: '0.5rem',
                border: `1px solid ${color}30`,
                padding: '0.75rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.4rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 700,
                      color,
                      background: `${color}20`,
                      borderRadius: '0.25rem',
                      padding: '0.1rem 0.4rem',
                      textTransform: 'uppercase',
                    }}
                  >
                    {priorityLabel}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>
                    {action}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={t.recommendations.copyLabel(action)}
                  onClick={() => { copyText(rec) }}
                  style={{
                    padding: '0.2rem 0.5rem',
                    borderRadius: '0.25rem',
                    border: '1px solid var(--border)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: '0.7rem',
                    flexShrink: 0,
                  }}
                >
                  {t.recommendations.copyButton}
                </button>
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {detail}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
