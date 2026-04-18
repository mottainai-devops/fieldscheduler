/**
 * Sentry Error Tracking Configuration
 * Captures and reports errors to Sentry for monitoring
 */

/**
 * Initialize Sentry for error tracking
 * This should be called as early as possible in the application lifecycle
 */
export function initializeSentry() {
  // Check if Sentry is available
  if (typeof window === 'undefined') {
    console.warn('[Sentry] Not available in server environment');
    return;
  }

  // Sentry DSN from environment
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
  if (!sentryDsn) {
    console.warn('[Sentry] DSN not configured, error tracking disabled');
    return;
  }

  console.log('[Sentry] Initializing error tracking...');

  // Initialize Sentry manually since we can't use decorators
  const environment = import.meta.env.MODE || 'development';
  const version = import.meta.env.VITE_APP_VERSION || '1.0.0';

  // Store configuration in window for later use
  (window as any).__SENTRY_CONFIG__ = {
    dsn: sentryDsn,
    environment,
    version,
    tracesSampleRate: environment === 'production' ? 0.1 : 1.0,
  };

  console.log('[Sentry] Initialized with environment:', environment);
}

/**
 * Capture an error and send to Sentry
 */
export function captureError(error: Error | string, context?: Record<string, any>) {
  try {
    const config = (window as any).__SENTRY_CONFIG__;
    if (!config) {
      console.warn('[Sentry] Not initialized');
      return;
    }

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
      sendToSentry(errorData, config.dsn);
    }
  } catch (err) {
    console.error('[Sentry] Failed to capture error:', err);
  }
}

/**
 * Capture a message
 */
export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  try {
    const config = (window as any).__SENTRY_CONFIG__;
    if (!config) {
      console.warn('[Sentry] Not initialized');
      return;
    }

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
      sendToSentry(messageData, config.dsn);
    }
  } catch (err) {
    console.error('[Sentry] Failed to capture message:', err);
  }
}

/**
 * Set user context for error tracking
 */
export function setUserContext(userId: string, email?: string, name?: string) {
  try {
    const config = (window as any).__SENTRY_CONFIG__;
    if (!config) {
      console.warn('[Sentry] Not initialized');
      return;
    }

    (window as any).__SENTRY_USER__ = {
      id: userId,
      email,
      name,
    };

    console.log('[Sentry] User context set:', userId);
  } catch (err) {
    console.error('[Sentry] Failed to set user context:', err);
  }
}

/**
 * Set custom context for error tracking
 */
export function setContext(name: string, context: Record<string, any>) {
  try {
    if (!(window as any).__SENTRY_CONTEXTS__) {
      (window as any).__SENTRY_CONTEXTS__ = {};
    }

    (window as any).__SENTRY_CONTEXTS__[name] = context;
    console.log('[Sentry] Context set:', name);
  } catch (err) {
    console.error('[Sentry] Failed to set context:', err);
  }
}

/**
 * Send error data to Sentry API
 */
async function sendToSentry(data: any, dsn: string) {
  try {
    // Extract project ID from DSN
    const dsnUrl = new URL(dsn);
    const projectId = dsnUrl.pathname.split('/').pop();

    // Build Sentry event
    const event = {
      ...data,
      user: (window as any).__SENTRY_USER__,
      contexts: (window as any).__SENTRY_CONTEXTS__,
      tags: {
        environment: data.environment,
        version: data.version,
      },
    };

    // Send to Sentry
    const response = await fetch(
      `https://${dsnUrl.host}/api/${projectId}/store/?sentry_key=${dsnUrl.username}&sentry_version=7`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
      }
    );

    if (!response.ok) {
      console.warn('[Sentry] Failed to send error:', response.status);
    }
  } catch (err) {
    console.error('[Sentry] Failed to send to Sentry:', err);
  }
}

/**
 * Setup global error handler
 */
export function setupGlobalErrorHandler() {
  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    captureError(event.error, {
      type: 'uncaught-error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      type: 'unhandled-rejection',
    });
  });

  console.log('[Sentry] Global error handler installed');
}

/**
 * Setup performance monitoring
 */
export function setupPerformanceMonitoring() {
  if (!('PerformanceObserver' in window)) {
    console.warn('[Sentry] PerformanceObserver not available');
    return;
  }

  try {
    // Monitor long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          captureMessage(`Long task detected: ${entry.name} (${entry.duration.toFixed(2)}ms)`, 'warning');
        }
      }
    });

    observer.observe({ entryTypes: ['longtask', 'measure'] });
    console.log('[Sentry] Performance monitoring enabled');
  } catch (err) {
    console.warn('[Sentry] Performance monitoring not available:', err);
  }
}

