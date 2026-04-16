/**
 * Web Worker: runs JSONL parsing off the main thread.
 * Communicates via postMessage with typed messages.
 */
import { parseJSONLString } from '@/core/parser/jsonl-parser'
import type { ParsedSession } from '@/types/session'

/** Message sent to the worker */
export interface WorkerRequest {
  type: 'parse'
  content: string
  /** Optional request ID for correlation */
  requestId: string
}

/** Progress update from worker (emitted every 10k lines) */
export interface WorkerProgress {
  type: 'progress'
  requestId: string
  percent: number
}

/** Success response from worker */
export interface WorkerSuccess {
  type: 'success'
  requestId: string
  session: ParsedSession
}

/** Error response from worker */
export interface WorkerError {
  type: 'error'
  requestId: string
  message: string
}

export type WorkerResponse = WorkerProgress | WorkerSuccess | WorkerError

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  if ((event.data as { type: string }).type !== 'parse') return  // ignore unknown message types

  const { content, requestId } = event.data

  try {
    // Emit synthetic progress ticks before the single blocking parse call.
    const chunkSize = 10_000
    const total = content.length
    let processed = 0

    while (processed < total - chunkSize) {
      processed += chunkSize
      const percent = Math.round((processed / total) * 90)
      const progress: WorkerProgress = { type: 'progress', requestId, percent }
      self.postMessage(progress)
    }

    const session: ParsedSession = parseJSONLString(content)
    const success: WorkerSuccess = { type: 'success', requestId, session }
    self.postMessage(success)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error in parse worker'
    const error: WorkerError = { type: 'error', requestId, message }
    self.postMessage(error)
  }
}
