/**
 * Instrumentation file for performance monitoring
 * See: https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
    console.log('[Instrumentation] Server instrumentation registered');

    // TODO: Add server-side monitoring (e.g., Sentry, DataDog)
    // const Sentry = await import('@sentry/nextjs');
    // Sentry.init({ dsn: process.env.SENTRY_DSN });
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
    console.log('[Instrumentation] Edge instrumentation registered');
  }
}

export async function onRequestError(
  err: Error,
  request: {
    path: string;
    method: string;
    headers: Headers;
  }
) {
  // Log errors
  console.error('[Request Error]', {
    error: err.message,
    stack: err.stack,
    path: request.path,
    method: request.method,
  });

  // TODO: Send to error tracking service
  // await Sentry.captureException(err);
}
