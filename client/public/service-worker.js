/**
 * Service Worker for Field Worker Scheduler
 * Provides offline support with cache-first and network-first strategies
 */

const CACHE_VERSION = 'v1';
const CACHE_NAME = `field-worker-scheduler-${CACHE_VERSION}`;
const OFFLINE_FALLBACK = '/offline.html';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[Service Worker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // API requests - network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Static assets - cache-first strategy
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // HTML pages - network-first strategy
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default - network-first strategy
  event.respondWith(networkFirstStrategy(request));
});

/**
 * Cache-first strategy: Try cache first, fall back to network
 */
async function cacheFirstStrategy(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      console.log('[Service Worker] Cache hit:', request.url);
      return cached;
    }

    const response = await fetch(request);
    if (!response || response.status !== 200 || response.type === 'error') {
      return response;
    }

    // Cache successful responses
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    console.log('[Service Worker] Cached:', request.url);

    return response;
  } catch (error) {
    console.error('[Service Worker] Cache-first error:', error);
    return caches.match(OFFLINE_FALLBACK);
  }
}

/**
 * Network-first strategy: Try network first, fall back to cache
 */
async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    
    if (!response || response.status !== 200 || response.type === 'error') {
      // Network failed, try cache
      const cached = await caches.match(request);
      if (cached) {
        console.log('[Service Worker] Using cached response:', request.url);
        return cached;
      }
      return response;
    }

    // Cache successful responses
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    console.log('[Service Worker] Cached:', request.url);

    return response;
  } catch (error) {
    console.error('[Service Worker] Network-first error:', error);
    
    // Try cache as fallback
    const cached = await caches.match(request);
    if (cached) {
      console.log('[Service Worker] Using cached response:', request.url);
      return cached;
    }

    // Return offline fallback for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match(OFFLINE_FALLBACK);
    }

    // Return error response
    return new Response('Offline - Resource not available', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

/**
 * Check if URL is a static asset
 */
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.js', '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.ico', '.webp',
  ];
  
  return staticExtensions.some((ext) => pathname.endsWith(ext));
}

/**
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  const { type, payload } = event.data;

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      handleClearCache(payload);
      break;

    case 'CACHE_URLS':
      handleCacheUrls(payload);
      break;

    default:
      console.log('[Service Worker] Unknown message type:', type);
  }
});

/**
 * Clear cache handler
 */
async function handleClearCache(payload) {
  try {
    const { cacheName } = payload;
    const name = cacheName || CACHE_NAME;
    
    await caches.delete(name);
    console.log('[Service Worker] Cache cleared:', name);
    
    // Notify all clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'CACHE_CLEARED',
        payload: { cacheName: name },
      });
    });
  } catch (error) {
    console.error('[Service Worker] Error clearing cache:', error);
  }
}

/**
 * Cache URLs handler
 */
async function handleCacheUrls(payload) {
  try {
    const { urls } = payload;
    const cache = await caches.open(CACHE_NAME);
    
    await Promise.all(
      urls.map((url) => {
        return cache.add(url).catch((error) => {
          console.warn('[Service Worker] Failed to cache:', url, error);
        });
      })
    );
    
    console.log('[Service Worker] Cached', urls.length, 'URLs');
  } catch (error) {
    console.error('[Service Worker] Error caching URLs:', error);
  }
}

/**
 * Handle background sync
 */
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync:', event.tag);

  if (event.tag === 'sync-offline-queue') {
    event.waitUntil(syncOfflineQueue());
  }
});

/**
 * Sync offline queue
 */
async function syncOfflineQueue() {
  try {
    console.log('[Service Worker] Syncing offline queue...');
    
    // Get all clients
    const clients = await self.clients.matchAll();
    
    // Notify clients to sync
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_OFFLINE_QUEUE',
        payload: {},
      });
    });
    
    console.log('[Service Worker] Sync complete');
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
    throw error;
  }
}

