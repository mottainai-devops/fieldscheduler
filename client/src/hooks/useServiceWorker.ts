import { useEffect, useState, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
}

/**
 * Hook to manage Service Worker registration and lifecycle
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false,
  });

  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Register service worker
  useEffect(() => {
    if (!state.isSupported) {
      console.warn('[useServiceWorker] Service Workers not supported');
      return;
    }

    const registerServiceWorker = async () => {
      try {
        console.log('[useServiceWorker] Registering service worker...');
        
        const reg = await navigator.serviceWorker.register('/service-worker.js', {
          scope: '/',
        });

        console.log('[useServiceWorker] Service worker registered:', reg);
        setRegistration(reg);
        setState((prev) => ({ ...prev, isRegistered: true }));

        // Check for updates periodically
        const updateCheckInterval = setInterval(() => {
          reg.update();
        }, 60000); // Check every minute

        // Listen for updates
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('[useServiceWorker] Update available');
              setState((prev) => ({ ...prev, updateAvailable: true }));
            }
          });
        });

        return () => clearInterval(updateCheckInterval);
      } catch (error) {
        console.error('[useServiceWorker] Registration failed:', error);
        setState((prev) => ({ ...prev, isRegistered: false }));
      }
    };

    registerServiceWorker();
  }, [state.isSupported]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      console.log('[useServiceWorker] Online');
      setState((prev) => ({ ...prev, isOnline: true }));
      
      // Trigger sync when coming back online
      if (registration?.sync) {
        registration.sync.register('sync-offline-queue');
      }
    };

    const handleOffline = () => {
      console.log('[useServiceWorker] Offline');
      setState((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [registration]);

  // Listen for messages from service worker
  useEffect(() => {
    if (!state.isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, payload } = event.data;

      switch (type) {
        case 'CACHE_CLEARED':
          console.log('[useServiceWorker] Cache cleared:', payload);
          break;

        case 'SYNC_OFFLINE_QUEUE':
          console.log('[useServiceWorker] Sync offline queue');
          // Trigger sync in your app
          window.dispatchEvent(new CustomEvent('sync-offline-queue'));
          break;

        default:
          console.log('[useServiceWorker] Unknown message:', type);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [state.isSupported]);

  // Clear cache
  const clearCache = useCallback(async (cacheName?: string) => {
    if (!registration?.active) {
      console.warn('[useServiceWorker] Service worker not active');
      return;
    }

    registration.active.postMessage({
      type: 'CLEAR_CACHE',
      payload: { cacheName },
    });
  }, [registration]);

  // Cache URLs
  const cacheUrls = useCallback(async (urls: string[]) => {
    if (!registration?.active) {
      console.warn('[useServiceWorker] Service worker not active');
      return;
    }

    registration.active.postMessage({
      type: 'CACHE_URLS',
      payload: { urls },
    });
  }, [registration]);

  // Update service worker
  const updateServiceWorker = useCallback(async () => {
    if (!registration?.waiting) {
      console.warn('[useServiceWorker] No waiting service worker');
      return;
    }

    // Tell the waiting service worker to skip waiting
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload the page when the new service worker takes over
    let refreshing = false;
    navigator.serviceWorker?.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, [registration]);

  return {
    ...state,
    registration,
    clearCache,
    cacheUrls,
    updateServiceWorker,
  };
}

/**
 * Hook to request background sync
 */
export function useBackgroundSync() {
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('serviceWorker' in navigator && 'SyncManager' in window);
  }, []);

  const requestSync = useCallback(async (tag: string) => {
    if (!isSupported) {
      console.warn('[useBackgroundSync] Background Sync not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log('[useBackgroundSync] Sync registered:', tag);
    } catch (error) {
      console.error('[useBackgroundSync] Failed to register sync:', error);
    }
  }, [isSupported]);

  return {
    isSupported,
    requestSync,
  };
}

