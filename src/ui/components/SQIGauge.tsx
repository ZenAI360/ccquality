import { useT } from '@/ui/context/LanguageContext'
import type { SQIResult } from '@/types/scoring'

interface SQIGaugeProps {
  result: SQIResult
}

/** Returns a colour string based on the score. */
function scoreColor(score: number): string {
  if (score >= 80) return '#4ac6d2'
  if (score >= 50) return '#f0a830'
  return '#e05252'
}

/**
 * Circular SVG gauge displaying the overall SQI score (0–100).
 * Shows sub-score breakdown as mini bars beneath the circle.
 */
export function SQIGauge({ result }: SQIGaugeProps) {
  const t = useT()
  const { overall, breakdown, rating } = result
  const color = scoreColor(overall)

  // SVG arc maths — radius 54, circumference ≈ 339
  const r = 54
  const circ = 2 * Math.PI * r
  const dashoffset = circ * (1 - overall / 100)

  const ratingLabel: Record<SQIResult['rating'], string> = {
    good: t.gauge.good,
    average: t.gauge.average,
    critical: t.gauge.critical,
  }

  const subScores: Array<{ label: string; value: number }> = [
    { label: t.gauge.subCompliance, value: breakdown.compliance },
    { label: t.gauge.subRead,        value: breakdown.readEfficiency },
    { label: t.gauge.subRetry,       value: breakdown.retryEfficiency },
    { label: t.gauge.subAttention,   value: breakdown.attentionDistribution },
    { label: t.gauge.subToken,       value: breakdown.tokenUtilisation },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.25rem',
        padding: '1.5rem',
        background: 'var(--surface)',
        borderRadius: '0.75rem',
        border: '1px solid var(--border)',
      }}
    >
      {/* Circular gauge */}
      <svg
        width="140"
        height="140"
        viewBox="0 0 140 140"
        role="img"
        aria-label={t.gauge.scoreLabel(overall, ratingLabel[rating])}
      >
        {/* Background track */}
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
        />
        {/* Foreground arc */}
        <circle
          cx="70" cy="70" r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={String(circ)}
          strokeDashoffset={String(dashoffset)}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        {/* Score text */}
        <text
          x="70" y="65"
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="28"
          fontWeight="700"
          fill={color}
        >
          {overall}
        </text>
        {/* Rating label */}
        <text
          x="70" y="88"
          textAnchor="middle"
          fontSize="12"
          fill="var(--text-muted)"
        >
          {ratingLabel[rating]}
        </text>
      </svg>

      {/* Sub-score bars */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {subScores.map(({ label, value }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '40px', fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
              {label}
            </span>
            <div
              role="progressbar"
              aria-valuenow={value}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${label}: ${String(value)}`}
              style={{
                flex: 1,
                height: '6px',
                borderRadius: '3px',
                background: 'var(--border)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${String(value)}%`,
                  background: scoreColor(value),
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <span style={{ width: '28px', fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
