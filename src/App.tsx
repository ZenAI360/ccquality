import { useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppShell } from './ui/components/AppShell'
import { UploadPage } from './ui/pages/UploadPage'
import { DashboardPage } from './ui/pages/DashboardPage'
import { LanguageProvider } from './ui/context/LanguageContext'
import { parseInWorker } from './core/parser/worker-bridge'
import type { ParsedSession } from './types/session'

/**
 * Root application component.
 * Manages top-level session state and routes between Upload and Dashboard.
 */
function App() {
  const [session, setSession] = useState<ParsedSession | undefined>(undefined)
  const [claudeMdContent, setClaudeMdContent] = useState<string | undefined>(undefined)
  const [parseError, setParseError] = useState<string | undefined>(undefined)

  const handleFileSelected = useCallback((file: File, claudeMdFile?: File) => {
    setParseError(undefined)

    if (claudeMdFile) {
      const reader = new FileReader()
      reader.onload = () => {
        setClaudeMdContent(reader.result as string)
      }
      reader.readAsText(claudeMdFile, 'utf-8')
    }

    parseInWorker(file).then(setSession).catch((err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Parse hatası'
      setParseError(msg)
    })
  }, [])

  return (
    <LanguageProvider>
    <BrowserRouter>
      <AppShell>
        {parseError && (
          <p
            role="alert"
            style={{
              color: '#e05252',
              background: 'rgba(224,82,82,0.1)',
              borderRadius: '0.4rem',
              padding: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}
          >
            {parseError}
          </p>
        )}
        <Routes>
          <Route path="/" element={<UploadPage onFileSelected={handleFileSelected} />} />
          <Route
            path="/dashboard"
            element={<DashboardPage session={session} claudeMdContent={claudeMdContent} />}
          />
        </Routes>
      </AppShell>
    </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
