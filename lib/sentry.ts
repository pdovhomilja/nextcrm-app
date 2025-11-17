import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Configuration for NextCRM
 *
 * This configuration enables error tracking, performance monitoring,
 * and session replay for production environments.
 */

export function initSentry() {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',

      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

      // Session Replay
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,

      // Error Filtering
      beforeSend(event, hint) {
        // Filter out known, harmless errors
        if (event.exception) {
          const error = event.exception.values?.[0];

          // Ignore rate limit errors (expected behavior)
          if (error?.value?.includes('Rate limit')) {
            return null;
          }

          // Ignore network errors in development
          if (process.env.NODE_ENV !== 'production' &&
              error?.value?.includes('Network')) {
            return null;
          }

          // Ignore cancelled requests
          if (error?.value?.includes('AbortError') ||
              error?.value?.includes('cancelled')) {
            return null;
          }
        }

        return event;
      },

      // Additional context
      initialScope: {
        tags: {
          app: 'nextcrm',
          version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
        },
      },

      // Integrations
      integrations: [
        new Sentry.BrowserTracing({
          // Set sampling rate for performance monitoring
          tracePropagationTargets: [
            'localhost',
            /^https:\/\/.*\.vercel\.app/,
          ],
        }),
        new Sentry.Replay({
          maskAllText: true,
          blockAllMedia: true,
        }),
      ],
    });
  }
}

/**
 * Capture custom error with context
 */
export function captureError(
  error: Error,
  context?: Record<string, any>
) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category?: string,
  level?: Sentry.SeverityLevel
) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: level || 'info',
    timestamp: Date.now() / 1000,
  });
}
