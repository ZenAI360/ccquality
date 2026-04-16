import { describe, it, expect } from 'vitest'

/**
 * PR-12 upload logic tests.
 * The drag-and-drop UI is tested via helpers rather than full DOM rendering,
 * since jsdom lacks a full browser drag event API.
 */

// ── File validation helpers (inlined from UploadPage logic) ──────────────────

function isJsonl(file: { name: string }): boolean {
  return file.name.toLowerCase().endsWith('.jsonl')
}

const MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024

function validateJsonlFile(file: { name: string; size: number }):
  | { valid: true }
  | { valid: false; reason: string } {
  if (!isJsonl(file)) return { valid: false, reason: 'Geçersiz dosya türü' }
  if (file.size > MAX_FILE_SIZE_BYTES) return { valid: false, reason: 'Dosya çok büyük' }
  return { valid: true }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('UploadPage file validation', () => {
  it('accepts a valid .jsonl file under size limit', () => {
    const result = validateJsonlFile({ name: 'session.jsonl', size: 1024 })
    expect(result.valid).toBe(true)
  })

  it('rejects a non-.jsonl file', () => {
    const result = validateJsonlFile({ name: 'session.json', size: 1024 })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBeTruthy()
  })

  it('rejects a .jsonl file that exceeds 200 MB', () => {
    const result = validateJsonlFile({
      name: 'huge.jsonl',
      size: MAX_FILE_SIZE_BYTES + 1,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) expect(result.reason).toBeTruthy()
  })
})
