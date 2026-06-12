// ============================================================
// LOGGER — Utilitário simples de log com níveis
// ============================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

function formatMessage(level: LogLevel, message: string, meta?: unknown): string {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  if (meta !== undefined) {
    return `${prefix} ${message} ${JSON.stringify(meta, null, 2)}`;
  }
  return `${prefix} ${message}`;
}

function log(level: LogLevel, message: string, meta?: unknown): void {
  if (levels[level] >= levels[currentLevel]) {
    const formatted = formatMessage(level, message, meta);
    if (level === 'error' || level === 'warn') {
      console.error(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => log('debug', message, meta),
  info: (message: string, meta?: unknown) => log('info', message, meta),
  warn: (message: string, meta?: unknown) => log('warn', message, meta),
  error: (message: string, meta?: unknown) => log('error', message, meta),
};
