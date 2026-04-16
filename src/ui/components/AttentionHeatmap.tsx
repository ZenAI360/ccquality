import { useState, useMemo } from 'react'
import type { ExtractedRule } from '@/types/rules'
import type { AnalysisResult } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface AttentionHeatmapProps {
  rules: ExtractedRule[]
  complianceResult: AnalysisResult
  deadzoneResult: AnalysisResult
  /** Total number of lines in the CLAUDE.md source (used to size the grid). */
  totalLines: number
}

/** Number of columns in the per-line grid. */
const GRID_COLS = 20

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns zone 1–5 for a given line number (1-indexed).
 * Zone 1 = top 20% of file, zone 5 = bottom 20%.
 */
function lineZone(lineNum: number, totalLines: number): number {
  if (totalLines === 0) return 1
  return Math.min(5, Math.floor(((lineNum - 1) / totalLines) * 5) + 1)
}

/** Extracts violated line numbers from compliance findings. */
function buildViolatedSet(result: AnalysisResult): Set<number> {
  const set = new Set<number>()
  for (const f of result.findings) {
    const m = /line (\d+)/iu.exec(f.description)
    if (m?.[1]) set.add(Number(m[1]))
  }
  return set
}

/** Indexes rules by CLAUDE.md line number. */
function buildRuleIndex(rules: ExtractedRule[]): Map<number, ExtractedRule> {
  const map = new Map<number, ExtractedRule>()
  for (const r of rules) map.set(r.lineNumber, r)
  return map
}

// ── Cell sub-components ───────────────────────────────────────────────────────

interface RuleCellProps {
  lineNum: number
  rule: ExtractedRule
  violated: boolean
  inDeadZone: boolean
  isHovered: boolean
  onEnter: () => void
  onLeave: () => void
  violationLabel: string
  compliantLabel: string
}

/** A single cell that represents a rule line — coloured green or red. */
function RuleCell({ lineNum, rule, violated, inDeadZone, isHovered, onEnter, onLeave, violationLabel, compliantLabel }: RuleCellProps) {
  const bg = violated ? 'rgba(224,82,82,0.85)' : 'rgba(61,220,132,0.75)'
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${violated ? violationLabel : compliantLabel}: ${rule.text.slice(0, 60)}`}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onFocus={onEnter}
      onBlur={onLeave}
      onKeyDown={() => undefined}
      style={{
        position: 'relative',
        height: '15px',
        borderRadius: '2px',
        background: bg,
        cursor: 'pointer',
        outline: inDeadZone ? '1px solid rgba(224,82,82,0.55)' : isHovered ? '1px solid #fff' : 'none',
        outlineOffset: '-1px',
        transition: 'outline-color 0.1s',
      }}
    >
      {isHovered && (
        <div
          role="tooltip"
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(8,8,18,0.96)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '4px',
            padding: '4px 10px',
            fontSize: '0.68rem',
            color: '#e8e8f0',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            zIndex: 1000,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ color: 'var(--amber)' }}>L{lineNum}</strong>
          {' · '}
          {rule.text.slice(0, 55)}
        </div>
      )}
    </div>
  )
}

/** A single cell for a non-rule line (comment, heading, blank). */
function BlankCell({ lineNum, inDeadZone }: { lineNum: number; inDeadZone: boolean }) {
  return (
    <div
      key={lineNum}
      aria-hidden="true"
      style={{
        height: '15px',
        borderRadius: '2px',
        background: inDeadZone ? 'rgba(224,82,82,0.07)' : 'rgba(255,255,255,0.04)',
      }}
    />
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Per-line grid heatmap for CLAUDE.md.
 * Each cell = one source line. Rule lines are green (compliant) or red (violated).
 * Non-rule lines are dark. Dead-zone cells receive a red tint.
 *
 * @param rules - Extracted rules from CLAUDE.md (must include lineNumber)
 * @param complianceResult - Output of checkCompliance (used for violated line numbers)
 * @param deadzoneResult - Output of mapDeadZones (used for dead zone band)
 * @param totalLines - Total line count of CLAUDE.md source
 */
export function AttentionHeatmap({ rules, complianceResult, deadzoneResult, totalLines }: AttentionHeatmapProps) {
  const t = useT()
  const [hovered, setHovered] = useState<ExtractedRule | undefined>()

  const violatedSet = useMemo(() => buildViolatedSet(complianceResult), [complianceResult])
  const ruleIndex = useMemo(() => buildRuleIndex(rules), [rules])

  const worstZone = typeof deadzoneResult.metrics['worst_zone'] === 'number'
    ? (deadzoneResult.metrics['worst_zone'] as number)
    : 0
  const hasDeadZone = deadzoneResult.score < 70 && worstZone > 0

  // Fall back to max rule lineNumber if totalLines was not provided
  const lineCount = totalLines > 0
    ? totalLines
    : (rules.length > 0 ? Math.max(...rules.map((r) => r.lineNumber)) : 0)

  if (lineCount === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
        {t.heatmap.noData}
      </div>
    )
  }

  const legendItems = [
    { color: 'rgba(61,220,132,0.75)', label: t.heatmap.legendCompliant },
    { color: 'rgba(224,82,82,0.85)', label: t.heatmap.legendViolation },
    { color: 'rgba(255,255,255,0.04)', label: t.heatmap.legendNoData },
    ...(hasDeadZone ? [{ color: 'rgba(224,82,82,0.07)', label: t.heatmap.legendDeadZone }] : []),
  ]

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem' }}>{t.heatmap.title}</h3>
        <InfoIcon text={t.heatmap.tooltip} width={280} />
      </div>

      {/* Per-line grid */}
      <div
        role="img"
        aria-label={t.heatmap.title}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${String(GRID_COLS)}, 1fr)`, gap: '2px' }}
      >
        {Array.from({ length: lineCount }, (_, i) => {
          const lineNum = i + 1
          const rule = ruleIndex.get(lineNum)
          const inDeadZone = hasDeadZone && lineZone(lineNum, lineCount) === worstZone
          if (rule) {
            return (
              <RuleCell
                key={lineNum}
                lineNum={lineNum}
                rule={rule}
                violated={violatedSet.has(lineNum)}
                inDeadZone={inDeadZone}
                isHovered={hovered?.id === rule.id}
                onEnter={() => { setHovered(rule) }}
                onLeave={() => { setHovered(undefined) }}
                violationLabel={t.heatmap.legendViolation}
                compliantLabel={t.heatmap.legendCompliant}
              />
            )
          }
          return <BlankCell key={lineNum} lineNum={lineNum} inDeadZone={inDeadZone} />
        })}
      </div>

      {/* Hover tooltip */}
      {hovered && (
        <div style={{ marginTop: '0.75rem', padding: '0.6rem 0.8rem', background: 'rgba(0,0,0,0.5)', borderRadius: '0.4rem', fontSize: '0.78rem', color: 'var(--text)' }}>
          <strong style={{ color: 'var(--amber)' }}>{t.heatmap.lineLabel(hovered.lineNumber)}</strong>{' '}
          {hovered.text.slice(0, 120)}
        </div>
      )}

      {/* Dead zone annotation */}
      {hasDeadZone && (
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.7rem', color: '#e05252' }}>
          {t.heatmap.deadZoneInfo(worstZone)}
        </p>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
        {legendItems.map(({ color, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: color, display: 'inline-block', flexShrink: 0 }} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}
