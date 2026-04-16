import { useState } from 'react'
import type { Finding } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface ReReadTableProps {
  findings: Finding[]
}

type SortKey = 'file' | 'tokenImpact'

/**
 * Table listing files with redundant reads, sorted by token impact.
 * Top-5 entries are visually highlighted.
 */
export function ReReadTable({ findings }: ReReadTableProps) {
  const t = useT()
  const [sortKey, setSortKey] = useState<SortKey>('tokenImpact')
  const [sortAsc, setSortAsc] = useState(false)

  const fileFindings = findings.filter((f) => f.id !== 'reread-claudemd')

  if (fileFindings.length === 0) {
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
        {t.rereadTable.noData}
      </div>
    )
  }

  const sorted = [...fileFindings].sort((a, b) => {
    if (sortKey === 'tokenImpact') {
      return sortAsc ? a.tokenImpact - b.tokenImpact : b.tokenImpact - a.tokenImpact
    }
    return sortAsc
      ? a.title.localeCompare(b.title)
      : b.title.localeCompare(a.title)
  })

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc((v) => !v)
    } else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const arrow = (key: SortKey) =>
    sortKey !== key ? '' : sortAsc ? ' ▲' : ' ▼'

  const thStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    textAlign: 'left',
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    userSelect: 'none',
    borderBottom: '1px solid var(--border)',
  }

  const tdStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem',
    fontSize: '0.78rem',
    borderBottom: '1px solid var(--border)',
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
          {t.rereadTable.title}
        </h3>
        <InfoIcon text={t.rereadTable.tooltip} width={250} />
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{ width: '100%', borderCollapse: 'collapse' }}
          aria-label={t.rereadTable.tableLabel}
        >
          <thead>
            <tr>
              <th style={thStyle} onClick={() => { toggleSort('file') }}>
                {t.rereadTable.colFile}{arrow('file')}
              </th>
              <th style={thStyle} onClick={() => { toggleSort('tokenImpact') }}>
                {t.rereadTable.colTokens}{arrow('tokenImpact')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((finding, i) => (
              <tr
                key={finding.id}
                style={{
                  background: i < 5 ? 'rgba(240,168,48,0.06)' : undefined,
                }}
              >
                <td style={tdStyle}>
                  <span
                    style={{ color: i < 5 ? 'var(--amber)' : 'var(--text)', fontWeight: i < 5 ? 600 : 400 }}
                  >
                    {finding.title.replace(/^File read \d+x — /, '')}
                  </span>
                </td>
                <td style={{ ...tdStyle, color: finding.tokenImpact > 1000 ? '#e05252' : 'var(--text)' }}>
                  {finding.tokenImpact.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
