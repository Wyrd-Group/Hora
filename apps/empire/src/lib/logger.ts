/**
 * Central logger — routes to console in dev, Sentry in prod.
 *
 * Why: 74 raw console.error/warn calls across 18 files had no central sink,
 * meaning prod errors went to the user's browser console and nowhere else.
 * This module funnels them all through a tagged logger that:
 *   - preserves dev-time visibility
 *   - forwards error-level events to Sentry when VITE_SENTRY_DSN is set
 *   - supports per-module tagging for grep-ability
 *   - is safe to import from Node/test contexts (Sentry import is lazy)
 */

export type LogContext = Record<string, unknown> | Error | unknown;

const isDev = (() => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production';
  }
})();

function toSentryExtra(ctx: LogContext | undefined, tag: string): Record<string, unknown> {
  if (ctx == null) return { tag };
  if (typeof ctx === 'object') return { tag, ...(ctx as Record<string, unknown>) };
  return { tag, ctx };
}

function sentryCapture(
  level: 'error' | 'warning' | 'info',
  message: string | Error,
  context?: LogContext,
  tag = 'aegis',
): void {
  // Lazy-import so test environments don't eagerly load Sentry.
  import('@sentry/react')
    .then((Sentry) => {
      const extra = toSentryExtra(context, tag);
      if (message instanceof Error) {
        Sentry.captureException(message, { level, extra });
      } else {
        Sentry.captureMessage(message, { level, extra });
      }
    })
    .catch(() => {
      /* Sentry unavailable — swallow, console has already captured. */
    });
}

export type Logger = {
  error: (msg: string | Error, ctx?: LogContext) => void;
  warn: (msg: string, ctx?: LogContext) => void;
  info: (msg: string, ctx?: LogContext) => void;
  debug: (msg: string, ctx?: LogContext) => void;
  child: (childTag: string) => Logger;
};

export function createLogger(tag: string): Logger {
  const prefix = `[${tag}]`;
  return {
    error: (msg, ctx) => {
      // eslint-disable-next-line no-console
      console.error(prefix, msg, ctx ?? '');
      if (!isDev) sentryCapture('error', msg, ctx, tag);
    },
    warn: (msg, ctx) => {
      // eslint-disable-next-line no-console
      console.warn(prefix, msg, ctx ?? '');
      if (!isDev) sentryCapture('warning', msg, ctx, tag);
    },
    info: (msg, ctx) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.info(prefix, msg, ctx ?? '');
      }
    },
    debug: (msg, ctx) => {
      if (isDev) {
        // eslint-disable-next-line no-console
        console.debug(prefix, msg, ctx ?? '');
      }
    },
    child: (childTag) => createLogger(`${tag}:${childTag}`),
  };
}

/** Root logger — prefer createLogger('your-module') for grep-ability. */
export const logger = createLogger('aegis');
