import { useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { AnalysisResult } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface WasteDonutProps {
  wasteResult: AnalysisResult
}

const CATEGORY_COLORS: Record<string, string> = {
  Productive: '#4ac6d2',
  ReRead: '#f0a830',
  Retry: '#e05252',
  System: '#888',
  Compaction: '#6a5acd',
  CacheMiss: '#5a9060',
}

const TOKEN_COST_USD_PER_1M = 3 // approximate blended cost

/**
 * Donut chart showing token waste breakdown across 6 categories.
 * Clicking a slice opens a detail panel.
 */
export function WasteDonut({ wasteResult }: WasteDonutProps) {
  const t = useT()
  const [active, setActive] = useState<string | undefined>(undefined)
  const total = wasteResult.metrics['total_tokens'] ?? 0
  const categories = ['Productive', 'ReRead', 'Retry', 'System', 'Compaction', 'CacheMiss']

  const data = categories
    .map((cat) => ({
      name: t.wasteDonut.categories[cat] ?? cat,
      key: cat,
      value: wasteResult.metrics[cat] ?? 0,
    }))
    .filter((d) => d.value > 0)

  if (data.length === 0) {
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
        {t.wasteDonut.noData}
      </div>
    )
  }

  const costUSD = total > 0 ? (total / 1_000_000) * TOKEN_COST_USD_PER_1M : 0
  const activeEntry = data.find((d) => d.key === active)

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: '0.75rem',
        padding: '1.5rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem' }}>
          {t.wasteDonut.title}
        </h3>
        <InfoIcon text={t.wasteDonut.tooltip} width={260} />
      </div>
      <p style={{ margin: '0 0 1rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
        {t.wasteDonut.total(total.toLocaleString(), costUSD.toFixed(4))}
      </p>

      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            onClick={(entry: { key: string }) => {
              setActive((prev) => (prev === entry.key ? undefined : entry.key))
            }}
            aria-label={t.wasteDonut.donutLabel}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={CATEGORY_COLORS[entry.key] ?? '#888'}
                opacity={active === undefined || active === entry.key ? 1 : 0.4}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid rgba(74,198,210,0.4)',
              borderRadius: '0.4rem',
              fontSize: '0.8rem',
              color: '#e8e8f0',
            }}
            labelStyle={{ color: '#e8e8f0' }}
            itemStyle={{ color: '#e8e8f0' }}
            formatter={(value: number, name: string) => [
              `${value.toLocaleString()} token (${total > 0 ? String(Math.round((value / total) * 100)) : '0'}%)`,
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: '0.72rem', color: '#e8e8f0' }}
            formatter={(value: string) => (
              <span style={{ color: '#e8e8f0' }}>{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {activeEntry && (
        <div
          style={{
            marginTop: '0.75rem',
            padding: '0.6rem 0.8rem',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '0.4rem',
            fontSize: '0.8rem',
          }}
        >
          <strong style={{ color: CATEGORY_COLORS[activeEntry.key] ?? 'var(--text)' }}>
            {activeEntry.name}:
          </strong>{' '}
          <span style={{ color: 'var(--text)' }}>
            {activeEntry.value.toLocaleString()} token
            {total > 0 && ` (${String(Math.round((activeEntry.value / total) * 100))}%)`}
          </span>
        </div>
      )}
    </div>
  )
}
