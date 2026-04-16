import { describe, it, expect, vi, afterEach } from 'vitest'
import type { WorkerSuccess, WorkerError, WorkerProgress, WorkerRequest } from '@/workers/parse-worker'
import type { ParsedSession } from '@/types/session'

/**
 * Worker bridge tests — stub Worker and FileReader globals.
 * jsdom does not implement either; we use vi.stubGlobal with constructor
 * functions that return plain objects so `worker === stub` after `new Worker()`.
 */

// ── Minimal ParsedSession fixture ─────────────────────────────────────────────

const stubSession: ParsedSession = {
  meta: {
    sessionId: 'sess_test', projectName: undefined, branch: undefined,
    startTime: undefined, endTime: undefined, totalTurns: 2,
    compactionBoundaries: [], isMultiSession: false,
  },
  messages: [], toolCalls: [],
  tokenTimeline: {
    entries: [], totalInput: 0, totalOutput: 0,
    totalCacheRead: 0, totalCacheCreation: 0, cacheHitRatio: 0,
  },
  toolCallsByFile: new Map(), parseErrors: [], rawLines: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Stubs FileReader so readAsText immediately resolves with `content`.
 * Returns the mock instance (the same object `new FileReader()` will produce).
 */
function stubFileReader(content: string) {
  const mock = {
    result: content,
    onload: null as (() => void) | null,
    onerror: null,
    error: null,
    readAsText() {
      const handler = mock.onload
      queueMicrotask(() => { handler?.() })
    },
  }
  // Regular function (not arrow) so `new FileReader()` returns `mock` via explicit return
  vi.stubGlobal('FileReader', function () { return mock })
  return mock
}

/**
 * Stubs Worker with a controlled reply function.
 * When parseInWorker calls `new Worker()`, it gets back `stub` directly.
 */
function stubWorker(
  replyFn: (req: WorkerRequest) => WorkerSuccess | WorkerError | WorkerProgress[],
) {
  const terminateSpy = vi.fn()
  const stub = {
    onmessage: null as ((ev: MessageEvent) => void) | null,
    onerror: null,
    terminate: terminateSpy,
    postMessage(data: WorkerRequest) {
      const replies = replyFn(data)
      const replyArray = Array.isArray(replies) ? replies : [replies]
      queueMicrotask(() => {
        for (const reply of replyArray) {
          stub.onmessage?.(new MessageEvent('message', { data: reply }))
        }
      })
    },
  }
  vi.stubGlobal('Worker', function () { return stub })
  return { stub, terminateSpy }
}

// ── Worker message type tests ─────────────────────────────────────────────────

describe('Worker message types', () => {
  it('WorkerRequest has correct shape', () => {
    const req: WorkerRequest = { type: 'parse', content: '{}', requestId: 'req_1' }
    expect(req.type).toBe('parse')
    expect(req.requestId).toBe('req_1')
  })

  it('WorkerSuccess has correct shape', () => {
    const msg: WorkerSuccess = { type: 'success', requestId: 'req_1', session: stubSession }
    expect(msg.type).toBe('success')
    expect(msg.session.meta.sessionId).toBe('sess_test')
  })

  it('WorkerError has correct shape', () => {
    const msg: WorkerError = { type: 'error', requestId: 'req_1', message: 'Something failed' }
    expect(msg.type).toBe('error')
    expect(msg.message).toBe('Something failed')
  })

  it('WorkerProgress has correct shape', () => {
    const msg: WorkerProgress = { type: 'progress', requestId: 'req_1', percent: 42 }
    expect(msg.type).toBe('progress')
    expect(msg.percent).toBeGreaterThanOrEqual(0)
    expect(msg.percent).toBeLessThanOrEqual(100)
  })
})

// ── parseInWorker bridge tests ────────────────────────────────────────────────

describe('parseInWorker bridge logic', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('resolves with ParsedSession when worker sends success', async () => {
    stubFileReader('{}')
    const { terminateSpy } = stubWorker((req) => ({
      type: 'success', requestId: req.requestId, session: stubSession,
    } satisfies WorkerSuccess))

    const { parseInWorker } = await import('@/core/parser/worker-bridge')
    const result = await parseInWorker(new File(['{}'], 'test.jsonl'))

    expect(result.meta.sessionId).toBe('sess_test')
    expect(terminateSpy).toHaveBeenCalled()
  })

  it('rejects when worker sends error response', async () => {
    stubFileReader('{}')
    const { terminateSpy } = stubWorker((req) => ({
      type: 'error', requestId: req.requestId, message: 'Parse failed',
    } satisfies WorkerError))

    const { parseInWorker } = await import('@/core/parser/worker-bridge')
    await expect(parseInWorker(new File(['{}'], 'bad.jsonl'))).rejects.toThrow('Parse failed')
    expect(terminateSpy).toHaveBeenCalled()
  })

  it('calls onProgress callback with percent values including final 100%', async () => {
    stubFileReader('{}')
    stubWorker((req) => [
      { type: 'progress', requestId: req.requestId, percent: 50 } satisfies WorkerProgress,
      { type: 'success', requestId: req.requestId, session: stubSession } satisfies WorkerSuccess,
    ])

    const progressValues: number[] = []
    const { parseInWorker } = await import('@/core/parser/worker-bridge')
    await parseInWorker(new File(['{}'], 'prog.jsonl'), (pct) => { progressValues.push(pct) })

    expect(progressValues).toContain(50)
    expect(progressValues).toContain(100)
  })
})
