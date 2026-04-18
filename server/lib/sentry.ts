/**
 * Sentry Error Tracking Configuration for Backend
 * Captures and reports server-side errors to Sentry
 */

import { TRPCError } from '@trpc/server';

interface SentryConfig {
  dsn: string;
  environment: string;
  version: string;
  tracesSampleRate: number;
}

let config: SentryConfig | null = null;

/**
 * Initialize Sentry for backend
 */
export function initializeSentry(options?: Partial<SentryConfig>) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  config = {
    dsn,
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '1.0.0',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    ...options,
  };

  console.log('[Sentry] Backend initialized with environment:', config.environment);
}

/**
 * Capture an error and send to Sentry
 */
export function captureError(error: Error | string, context?: Record<string, any>) {
  if (!config) {
    console.warn('[Sentry] Not initialized');
    return;
  }

  try {
    const errorData = {
      message: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'string' ? undefined : error.stack,
      context,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      version: config.version,
    };

    console.error('[Sentry] Capturing error:', errorData);

    // In production, send to Sentry API
    if (config.environment === 'production') {
      sendToSentry(errorData);
    }
  } catch (err) {
    console.error('[Sentry] Failed to capture error:', err);
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  if (!config) {
    console.warn('[Sentry] Not initialized');
    return;
  }

  try {
    const messageData = {
      message,
      level,
      timestamp: new Date().toISOString(),
      environment: config.environment,
      version: config.version,
    };

    console.log(`[Sentry] ${level.toUpperCase()}: ${message}`);

    // In production, send to Sentry API
    if (config.environment === 'production') {
      sendToSentry(messageData);
    }
  } catch (err) {
    console.error('[Sentry] Failed to capture message:', err);
  }
}

/**
 * Capture a tRPC error
 */
export function captureTRPCError(error: TRPCError, context?: Record<string, any>) {
  captureError(error, {
    ...context,
    code: error.code,
    cause: error.cause,
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string | number, email?: string, name?: string) {
  if (!config) {
    console.warn('[Sentry] Not initialized');
    return;
  }

  // Store in process context (would need middleware to pass through requests)
  (global as any).__SENTRY_USER__ = {
    id: String(userId),
    email,
    name,
  };

  console.log('[Sentry] User context set:', userId);
}

/**
 * Set custom context for error tracking
 */
export function setContext(name: string, context: Record<string, any>) {
  if (!config) {
    console.warn('[Sentry] Not initialized');
    return;
  }

  if (!(global as any).__SENTRY_CONTEXTS__) {
    (global as any).__SENTRY_CONTEXTS__ = {};
  }

  (global as any).__SENTRY_CONTEXTS__[name] = context;
  console.log('[Sentry] Context set:', name);
}

/**
 * Send error data to Sentry API
 */
async function sendToSentry(data: any) {
  if (!config) {
    return;
  }

  try {
    // Extract project ID from DSN
    const dsnUrl = new URL(config.dsn);
    const projectId = dsnUrl.pathname.split('/').pop();

    // Build Sentry event
    const event = {
      ...data,
      user: (global as any).__SENTRY_USER__,
      contexts: (global as any).__SENTRY_CONTEXTS__,
      tags: {
        environment: config.environment,
        version: config.version,
      },
      platform: 'node',
      sdk: {
        name: 'field-worker-scheduler',
        version: config.version,
      },
    };

    // Send to Sentry (non-blocking)
    fetch(
      `https://${dsnUrl.host}/api/${projectId}/store/?sentry_key=${dsnUrl.username}&sentry_version=7`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    ).catch((err) => {
      console.warn('[Sentry] Failed to send error:', err);
    });
  } catch (err) {
    console.error('[Sentry] Failed to send to Sentry:', err);
  }
}

/**
 * Middleware to capture tRPC errors
 */
export function sentryErrorMiddleware() {
  return async (opts: any) => {
    try {
      return await opts.next();
    } catch (error) {
      if (error instanceof TRPCError) {
        captureTRPCError(error, {
          procedure: opts.path,
          type: opts.type,
        });
      } else {
        captureError(error as Error, {
          procedure: opts.path,
          type: opts.type,
        });
      }
      throw error;
    }
  };
}

/**
 * Setup global error handler for uncaught exceptions
 */
export function setupGlobalErrorHandler() {
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('[Sentry] Uncaught exception:', error);
    captureError(error, {
      type: 'uncaught-exception',
    });
    // Exit after logging
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason) => {
    console.error('[Sentry] Unhandled rejection:', reason);
    captureError(reason as Error, {
      type: 'unhandled-rejection',
    });
  });

  console.log('[Sentry] Global error handler installed');
}

/**
 * Setup performance monitoring
 */
export function setupPerformanceMonitoring() {
  // Monitor slow database queries
  const originalQuery = (global as any).db?.query;
  if (originalQuery) {
    (global as any).db.query = async function (...args: any[]) {
      const start = Date.now();
      try {
        const result = await originalQuery.apply(this, args);
        const duration = Date.now() - start;

        if (duration > 1000) {
          captureMessage(`Slow query detected: ${duration}ms`, 'warning');
        }

        return result;
      } catch (error) {
        const duration = Date.now() - start;
        captureError(error as Error, {
          type: 'db-query-error',
          duration,
        });
        throw error;
      }
    };
  }

  console.log('[Sentry] Performance monitoring enabled');
}

