import type { ParsedSession } from '@/types/session'
import type { WorkerRequest, WorkerResponse } from '@/workers/parse-worker'
import { logger } from '@/utils/logger'

const PARSE_TIMEOUT_MS = 30_000

/**
 * Reads a File object as a UTF-8 string.
 * @param file - File to read
 * @returns Promise resolving to the file's text content
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve(reader.result as string)
    }
    reader.onerror = () => {
      reject(new Error(`FileReader error: ${String(reader.error?.message)}`))
    }
    reader.readAsText(file, 'utf-8')
  })
}

/**
 * Generates a short unique request ID.
 */
function makeRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`
}

/**
 * Parses a JSONL file in a Web Worker, keeping the main thread unblocked.
 * @param file - The .jsonl file to parse
 * @param onProgress - Optional callback receiving progress percent (0–100)
 * @returns Promise resolving to a ParsedSession
 * @throws Error if parsing fails or times out after 30s
 */
export function parseInWorker(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<ParsedSession> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../../workers/parse-worker.ts', import.meta.url), {
      type: 'module',
    })
    const requestId = makeRequestId()

    const timeoutHandle = setTimeout(() => {
      worker.terminate()
      reject(new Error(`Parse timed out after ${String(PARSE_TIMEOUT_MS)}ms`))
    }, PARSE_TIMEOUT_MS)

    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const msg = event.data
      if (msg.requestId !== requestId) return

      if (msg.type === 'progress') {
        onProgress?.(msg.percent)
      } else if (msg.type === 'success') {
        clearTimeout(timeoutHandle)
        worker.terminate()
        onProgress?.(100)
        resolve(msg.session)
      } else if (msg.type === 'error') {
        clearTimeout(timeoutHandle)
        worker.terminate()
        reject(new Error(msg.message))
      } else {
        // Unknown message type — ignore; do not reject (may be a future extension)
        logger.debug('parse-worker: unknown message type', { type: (msg as Record<string, unknown>)['type'] })
      }
    }

    worker.onerror = (ev: ErrorEvent) => {
      clearTimeout(timeoutHandle)
      worker.terminate()
      reject(new Error(`Worker crashed: ${ev.message}`))
    }

    readFileAsText(file)
      .then((content) => {
        const request: WorkerRequest = { type: 'parse', content, requestId }
        worker.postMessage(request)
        logger.debug('parse-worker: request sent', { requestId, size: content.length })
      })
      .catch((err: unknown) => {
        clearTimeout(timeoutHandle)
        worker.terminate()
        reject(err instanceof Error ? err : new Error('File read failed'))
      })
  })
}
