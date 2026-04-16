import { useRef, useState, useCallback } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useT } from '@/ui/context/LanguageContext'

/** Maximum accepted file size: 200 MB */
const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

interface UploadState {
  status: 'idle' | 'dragging' | 'error'
  errorMessage: string | undefined
}

interface UploadPageProps {
  /** Called when a valid JSONL file is selected — App-level state setter */
  onFileSelected: (file: File, claudeMdFile?: File) => void
}

/** Returns true if the file has a .jsonl extension. */
function isJsonl(file: File): boolean {
  return file.name.toLowerCase().endsWith('.jsonl')
}

/** Returns true if the file is a Markdown file (assumed CLAUDE.md). */
function isMarkdown(file: File): boolean {
  return file.name.toLowerCase().endsWith('.md')
}

/**
 * Upload page component.
 * Accepts a JSONL file via drag & drop or file picker.
 * Optionally accepts a CLAUDE.md alongside the JSONL.
 */
export function UploadPage({ onFileSelected }: UploadPageProps) {
  const t = useT()
  const navigate = useNavigate()
  const jsonlInputRef = useRef<HTMLInputElement>(null)
  const mdInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<UploadState>({ status: 'idle', errorMessage: undefined })
  const [pendingMd, setPendingMd] = useState<File | undefined>(undefined)

  const setError = useCallback((msg: string) => {
    setState({ status: 'error', errorMessage: msg })
  }, [])

  const handleJsonlFile = useCallback(
    (file: File) => {
      if (!isJsonl(file)) {
        setError(t.upload.errorNotJsonl)
        return
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(t.upload.errorTooBig(String(Math.round(file.size / 1024 / 1024))))
        return
      }
      setState({ status: 'idle', errorMessage: undefined })
      onFileSelected(file, pendingMd)
      void navigate('/dashboard')
    },
    [navigate, onFileSelected, pendingMd, setError, t],
  )

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setState((prev) => ({ ...prev, status: 'dragging' }))
  }, [])

  const onDragLeave = useCallback(() => {
    setState((prev) => ({ ...prev, status: prev.status === 'dragging' ? 'idle' : prev.status }))
  }, [])

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setState((prev) => ({ ...prev, status: 'idle' }))
      const files = Array.from(e.dataTransfer.files)
      const jsonlFile = files.find(isJsonl)
      const mdFile = files.find(isMarkdown)
      if (mdFile) setPendingMd(mdFile)
      if (jsonlFile) {
        handleJsonlFile(jsonlFile)
      } else {
        setError(t.upload.errorNoJsonl)
      }
    },
    [handleJsonlFile, setError, t],
  )

  const onJsonlInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.item(0)
      if (file) handleJsonlFile(file)
    },
    [handleJsonlFile],
  )

  const onMdInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0)
    if (file) setPendingMd(file)
  }, [])

  const loadDemo = useCallback(() => {
    void fetch('/fixtures/demo-session.jsonl')
      .then((r) => r.blob())
      .then((blob) => {
        const demoFile = new File([blob], 'demo-session.jsonl', { type: 'text/plain' })
        handleJsonlFile(demoFile)
      })
      .catch(() => {
        setError(t.upload.errorDemo)
      })
  }, [handleJsonlFile, setError, t])

  const isDragging = state.status === 'dragging'

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '4rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
      }}
    >
      <div>
        <h1 style={{ color: 'var(--amber)', margin: 0, fontSize: '1.5rem' }}>
          {t.upload.title}
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.875rem' }}>
          {t.upload.subtitle}
        </p>
      </div>

      {/* Drop zone */}
      <div
        role="button"
        aria-label={t.upload.dropzoneLabel}
        tabIndex={0}
        onClick={() => { jsonlInputRef.current?.click() }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            jsonlInputRef.current?.click()
          }
        }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${isDragging ? 'var(--cyan)' : 'var(--border)'}`,
          borderRadius: '0.75rem',
          padding: '3rem 2rem',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(74,198,210,0.05)' : 'var(--surface)',
          transition: 'border-color 0.15s, background 0.15s',
        }}
      >
        <p style={{ margin: 0, color: 'var(--text)', fontSize: '1rem' }}>
          {t.upload.dropzoneText}
        </p>
        <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
          {t.upload.dropzoneHint}
        </p>
      </div>

      <input
        ref={jsonlInputRef}
        type="file"
        accept=".jsonl"
        aria-label={t.upload.dropzoneLabel}
        style={{ display: 'none' }}
        onChange={onJsonlInputChange}
      />

      {/* Optional CLAUDE.md */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          type="button"
          aria-label={t.upload.addClaudeMd}
          onClick={() => { mdInputRef.current?.click() }}
          style={{
            padding: '0.4rem 0.9rem',
            borderRadius: '0.4rem',
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          {t.upload.addClaudeMd}
        </button>
        {pendingMd && (
          <span style={{ color: 'var(--cyan)', fontSize: '0.8rem' }}>{pendingMd.name}</span>
        )}
      </div>

      <input
        ref={mdInputRef}
        type="file"
        accept=".md"
        aria-label={t.upload.addClaudeMd}
        style={{ display: 'none' }}
        onChange={onMdInputChange}
      />

      {/* Error message */}
      {state.errorMessage && (
        <p
          role="alert"
          style={{
            color: '#e05252',
            background: 'rgba(224,82,82,0.1)',
            borderRadius: '0.4rem',
            padding: '0.75rem',
            margin: 0,
            fontSize: '0.875rem',
          }}
        >
          {state.errorMessage}
        </p>
      )}

      {/* Demo button */}
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          aria-label={t.upload.demoButton}
          onClick={loadDemo}
          style={{
            padding: '0.5rem 1.25rem',
            borderRadius: '0.5rem',
            border: 'none',
            background: 'var(--amber)',
            color: '#06060a',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {t.upload.demoButton}
        </button>
      </div>
    </div>
  )
}
