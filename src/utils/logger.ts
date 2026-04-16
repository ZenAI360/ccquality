/** Log severity levels in ascending order */
type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
}

const activeLevel: LogLevel = import.meta.env.DEV ? 'debug' : 'warn'

/**
 * Emits a log entry if the given level meets the active threshold.
 * @param level - Severity of the message
 * @param args - Values to log
 */
function emit(level: LogLevel, ...args: unknown[]): void {
  if (LEVEL_RANK[level] < LEVEL_RANK[activeLevel]) return
  const prefix = `[CCQ:${level.toUpperCase()}]`
  /* eslint-disable no-console */
  if (level === 'debug') console.debug(prefix, ...args)
  else if (level === 'info') console.info(prefix, ...args)
  else if (level === 'warn') console.warn(prefix, ...args)
  else console.error(prefix, ...args)
  /* eslint-enable no-console */
}

/** Project-wide logger. Use instead of console.log everywhere. */
export const logger = {
  /** Verbose diagnostic information (dev only) */
  debug(...args: unknown[]): void {
    emit('debug', ...args)
  },
  /** General informational messages */
  info(...args: unknown[]): void {
    emit('info', ...args)
  },
  /** Non-fatal warnings */
  warn(...args: unknown[]): void {
    emit('warn', ...args)
  },
  /** Errors that need attention */
  error(...args: unknown[]): void {
    emit('error', ...args)
  },
}
