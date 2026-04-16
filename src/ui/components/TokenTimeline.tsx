import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import type { TokenTimeline as TokenTimelineData } from '@/types/session'
import type { AnalysisResult } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface TokenTimelineProps {
  timeline: TokenTimelineData
  retryResult: AnalysisResult | undefined
}

interface ChartEntry {
  turn: number
  total: number
  isRetry: boolean
}

const COLOR_NORMAL = 'rgba(74,198,210,0.75)'
const COLOR_RETRY = 'rgba(224,82,82,0.85)'

/**
 * Collects every turn number that falls inside any retry finding's turnRange.
 * Used to colour individual bars red without adding reference lines.
 */
function buildRetryTurnSet(retryResult: AnalysisResult | undefined): Set<number> {
  const set = new Set<number>()
  for (const f of retryResult?.findings ?? []) {
    if (!f.turnRange) continue
    const [start, end] = f.turnRange as [number, number]
    for (let t = start; t <= end; t++) set.add(t)
  }
  return set
}

/**
 * Maps timeline entries to chart rows.
 * Bar height = total tokens per turn (input + output + cacheRead).
 */
function buildChartData(timeline: TokenTimelineData, retrySet: Set<number>): ChartEntry[] {
  return timeline.entries.map((e) => ({
    turn: e.turn,
    total: e.inputTokens + e.outputTokens + e.cacheRead,
    isRetry: retrySet.has(e.turn),
  }))
}

/** Formats large token counts as "450k" for the Y-axis. */
function formatTokenCount(v: number): string {
  return v >= 1000 ? `${String(Math.round(v / 1000))}k` : String(v)
}

/**
 * Per-turn token consumption bar chart.
 * Each bar = one conversation turn; bars within retry loop ranges are red.
 *
 * @param timeline - Per-turn token data from the parsed session
 * @param retryResult - Output of detectRetryLoops (drives retry bar colouring)
 */
export function TokenTimeline({ timeline, retryResult }: TokenTimelineProps) {
  const t = useT()
  const retrySet = buildRetryTurnSet(retryResult)
  const data = buildChartData(timeline, retrySet)
  const hasRetry = retrySet.size > 0
  const tickInterval = Math.max(1, Math.floor(data.length / 12))

  if (data.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>
        {t.timeline.noData}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem' }}>{t.timeline.title}</h3>
        <InfoIcon text={t.timeline.tooltip} width={260} />
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 16 }} barCategoryGap="10%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="turn"
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            interval={tickInterval}
            label={{ value: t.timeline.turn, position: 'insideBottom', offset: -4, fontSize: 10, fill: 'var(--text-muted)' }}
          />
          <YAxis
            tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
            width={46}
            tickFormatter={formatTokenCount}
          />
          <Tooltip
            contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(74,198,210,0.4)', borderRadius: '0.4rem', fontSize: '0.78rem', color: '#e8e8f0' }}
            labelStyle={{ color: 'var(--amber)', fontWeight: 600 }}
            itemStyle={{ color: '#e8e8f0' }}
            labelFormatter={(v: unknown) => {
              const turn = Number(v)
              const suffix = retrySet.has(turn) ? ` · ▲ ${t.timeline.retry}` : ''
              return `${t.timeline.turn} ${String(turn)}${suffix}`
            }}
            formatter={(value: number) => [value.toLocaleString(), t.timeline.totalTokens]}
          />
          <Bar dataKey="total" radius={[2, 2, 0, 0]} maxBarSize={20} isAnimationActive={false}>
            {data.map((entry) => (
              <Cell key={`cell-${String(entry.turn)}`} fill={entry.isRetry ? COLOR_RETRY : COLOR_NORMAL} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', justifyContent: 'center' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: COLOR_NORMAL, display: 'inline-block' }} />
          {t.timeline.normal}
        </span>
        {hasRetry && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: COLOR_RETRY, display: 'inline-block' }} />
            {t.timeline.retry}
          </span>
        )}
      </div>
    </div>
  )
}
