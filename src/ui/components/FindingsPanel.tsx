import { useState } from 'react'
import type { Finding, FindingSeverity } from '@/types/analysis'
import { useT } from '@/ui/context/LanguageContext'
import { InfoIcon } from './InfoIcon'

interface FindingsPanelProps {
  findings: Finding[]
}

const PAGE_SIZE = 10

const SEVERITY_ORDER: Record<FindingSeverity, number> = {
  critical: 0,
  warn: 1,
  info: 2,
}

const SEVERITY_COLOR: Record<FindingSeverity, string> = {
  critical: '#e05252',
  warn: '#f0a830',
  info: '#4ac6d2',
}

const BTN_BASE: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: '0.3rem',
  padding: '0.2rem 0.65rem',
  cursor: 'pointer',
  fontSize: '0.72rem',
  color: 'var(--text-muted)',
}

// ── Sub-components ────────────────────────────────────────────────────────────

/** Single accordion row for one finding. */
function FindingRow({ finding, isOpen, onToggle }: { finding: Finding; isOpen: boolean; onToggle: () => void }) {
  const t = useT()
  const color = SEVERITY_COLOR[finding.severity]
  const severityLabel = t.findings.severity[finding.severity] ?? finding.severity
  return (
    <div style={{ borderRadius: '0.4rem', overflow: 'hidden', border: `1px solid ${color}30` }}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={`finding-body-${finding.id}`}
        onClick={onToggle}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.8rem', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: '0.65rem', fontWeight: 700, color, background: `${color}20`, borderRadius: '0.25rem', padding: '0.1rem 0.4rem', flexShrink: 0, textTransform: 'uppercase' }}>
          {severityLabel}
        </span>
        <span style={{ flex: 1, fontSize: '0.82rem', color: 'var(--text)' }}>{finding.title}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
      </button>
      {isOpen && (
        <div id={`finding-body-${finding.id}`} style={{ padding: '0.5rem 0.8rem 0.75rem', borderTop: `1px solid ${color}20` }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text)' }}>{finding.description}</p>
          {finding.evidence && (
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{finding.evidence}</p>
          )}
          {finding.turnRange && (
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {t.findings.turnsLabel(finding.turnRange[0], finding.turnRange[1])}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Previous / page-indicator / next pagination bar. */
function Paginator({ page, totalPages, pageLabel, prevLabel, nextLabel, onChange }: {
  page: number
  totalPages: number
  pageLabel: string
  prevLabel: string
  nextLabel: string
  onChange: (p: number) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', marginTop: '0.75rem' }}>
      <button type="button" style={{ ...BTN_BASE, opacity: page === 0 ? 0.35 : 1, cursor: page === 0 ? 'not-allowed' : 'pointer' }} disabled={page === 0} onClick={() => { onChange(page - 1) }}>
        ← {prevLabel}
      </button>
      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '80px', textAlign: 'center' }}>{pageLabel}</span>
      <button type="button" style={{ ...BTN_BASE, opacity: page === totalPages - 1 ? 0.35 : 1, cursor: page === totalPages - 1 ? 'not-allowed' : 'pointer' }} disabled={page === totalPages - 1} onClick={() => { onChange(page + 1) }}>
        {nextLabel} →
      </button>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Accordion list of findings sorted by severity, paginated 10 per page.
 *
 * @param findings - All findings from every analysis engine
 */
export function FindingsPanel({ findings }: FindingsPanelProps) {
  const t = useT()
  const [openId, setOpenId] = useState<string | undefined>()
  const [page, setPage] = useState(0)

  if (findings.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center', fontSize: '0.875rem' }}>
        {t.findings.noData}
      </div>
    )
  }

  const sorted = [...findings].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const pageSlice = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handlePageChange = (newPage: number) => {
    setPage(newPage)
    setOpenId(undefined)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '0.75rem', padding: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text)', fontSize: '0.9rem' }}>{t.findings.title(findings.length)}</h3>
        <InfoIcon text={t.findings.tooltip} width={250} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        {pageSlice.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            isOpen={openId === finding.id}
            onToggle={() => { setOpenId(openId === finding.id ? undefined : finding.id) }}
          />
        ))}
      </div>

      {totalPages > 1 && (
        <Paginator
          page={page}
          totalPages={totalPages}
          pageLabel={t.findings.page(page + 1, totalPages)}
          prevLabel={t.findings.prevPage}
          nextLabel={t.findings.nextPage}
          onChange={handlePageChange}
        />
      )}
    </div>
  )
}
