import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useLanguage, useT } from '@/ui/context/LanguageContext'
import type { Lang } from '@/i18n/translations'

interface AppShellProps {
  children: ReactNode
}

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'tr', label: 'TR' },
  { code: 'en', label: 'EN' },
]

/**
 * Application shell: top bar with logo, navigation, language toggle, and content area.
 */
export function AppShell({ children }: AppShellProps) {
  const { pathname } = useLocation()
  const { lang, setLang } = useLanguage()
  const t = useT()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem',
          padding: '0.75rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
        }}
      >
        <Link
          to="/"
          aria-label={t.nav.homeLabel}
          style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber)' }}>
            CCQuality
          </span>
        </Link>

        <nav aria-label={t.nav.navLabel} style={{ display: 'flex', gap: '1rem', flex: 1 }}>
          <Link
            to="/"
            aria-current={pathname === '/' ? 'page' : undefined}
            style={{
              color: pathname === '/' ? 'var(--cyan)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {t.nav.upload}
          </Link>
          <Link
            to="/dashboard"
            aria-current={pathname === '/dashboard' ? 'page' : undefined}
            style={{
              color: pathname === '/dashboard' ? 'var(--cyan)' : 'var(--text-muted)',
              textDecoration: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            {t.nav.panel}
          </Link>
        </nav>

        {/* Language toggle */}
        <div
          role="group"
          aria-label="Language / Dil"
          style={{ display: 'flex', gap: '2px', marginLeft: 'auto' }}
        >
          {LANGS.map(({ code, label }) => (
            <button
              key={code}
              type="button"
              aria-pressed={lang === code}
              aria-label={`Switch to ${label}`}
              onClick={() => { setLang(code) }}
              style={{
                padding: '0.2rem 0.55rem',
                borderRadius: '0.3rem',
                border: lang === code ? '1px solid var(--cyan)' : '1px solid var(--border)',
                background: lang === code ? 'rgba(74,198,210,0.12)' : 'transparent',
                color: lang === code ? 'var(--cyan)' : 'var(--text-muted)',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main style={{ padding: '1.5rem' }}>{children}</main>
    </div>
  )
}
