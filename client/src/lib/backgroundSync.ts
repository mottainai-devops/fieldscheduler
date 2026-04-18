/**
 * Background Sync Manager
 * Handles automatic syncing of offline queue when connection is restored
 */

export interface SyncTask {
  id: string;
  type: 'gps-location' | 'customer-update' | 'route-completion' | 'form-submission';
  data: Record<string, any>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const SYNC_QUEUE_KEY = 'offline-sync-queue';
const SYNC_METADATA_KEY = 'offline-sync-metadata';

/**
 * Initialize background sync
 */
export async function initializeBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[BackgroundSync] Background Sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('[BackgroundSync] Service Worker ready, Background Sync available');

    // Listen for online event to trigger sync
    window.addEventListener('online', () => {
      triggerSync('sync-offline-queue');
    });

    // Listen for sync messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data.type === 'SYNC_OFFLINE_QUEUE') {
        syncOfflineQueue();
      }
    });
  } catch (error) {
    console.error('[BackgroundSync] Initialization failed:', error);
  }
}

/**
 * Add task to sync queue
 */
export function addSyncTask(task: Omit<SyncTask, 'id' | 'timestamp' | 'retries'>) {
  try {
    const queue = getQueue();
    const newTask: SyncTask = {
      ...task,
      id: `${task.type}-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };

    queue.push(newTask);
    saveQueue(queue);
    updateSyncMetadata();

    console.log('[BackgroundSync] Task added:', newTask.id);

    // Request background sync if supported
    requestBackgroundSync('sync-offline-queue');

    return newTask.id;
  } catch (error) {
    console.error('[BackgroundSync] Failed to add task:', error);
    return null;
  }
}

/**
 * Get sync queue
 */
export function getQueue(): SyncTask[] {
  try {
    const data = localStorage.getItem(SYNC_QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('[BackgroundSync] Failed to get queue:', error);
    return [];
  }
}

/**
 * Save sync queue
 */
export function saveQueue(queue: SyncTask[]) {
  try {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.error('[BackgroundSync] Failed to save queue:', error);
  }
}

/**
 * Clear sync queue
 */
export function clearQueue() {
  try {
    localStorage.removeItem(SYNC_QUEUE_KEY);
    updateSyncMetadata();
    console.log('[BackgroundSync] Queue cleared');
  } catch (error) {
    console.error('[BackgroundSync] Failed to clear queue:', error);
  }
}

/**
 * Get queue size
 */
export function getQueueSize(): number {
  return getQueue().length;
}

/**
 * Sync offline queue
 */
export async function syncOfflineQueue() {
  if (!navigator.onLine) {
    console.log('[BackgroundSync] Still offline, skipping sync');
    return;
  }

  const queue = getQueue();
  if (queue.length === 0) {
    console.log('[BackgroundSync] Queue is empty');
    return;
  }

  console.log('[BackgroundSync] Starting sync, tasks:', queue.length);

  const results = {
    synced: 0,
    failed: 0,
    retried: 0,
  };

  // Process tasks in order
  for (const task of queue) {
    try {
      const success = await syncTask(task);

      if (success) {
        results.synced++;
        // Remove from queue
        removeTask(task.id);
      } else if (task.retries < task.maxRetries) {
        results.retried++;
        // Increment retry count
        task.retries++;
        saveQueue(getQueue());
      } else {
        results.failed++;
        // Remove after max retries
        removeTask(task.id);
      }
    } catch (error) {
      console.error('[BackgroundSync] Error syncing task:', task.id, error);
      results.failed++;
      removeTask(task.id);
    }
  }

  console.log('[BackgroundSync] Sync complete:', results);
  updateSyncMetadata();

  // Notify app of sync completion
  window.dispatchEvent(
    new CustomEvent('sync-complete', {
      detail: results,
    })
  );
}

/**
 * Sync individual task
 */
async function syncTask(task: SyncTask): Promise<boolean> {
  try {
    // Implement sync logic based on task type
    switch (task.type) {
      case 'gps-location':
        return await syncGpsLocation(task);

      case 'customer-update':
        return await syncCustomerUpdate(task);

      case 'route-completion':
        return await syncRouteCompletion(task);

      case 'form-submission':
        return await syncFormSubmission(task);

      default:
        console.warn('[BackgroundSync] Unknown task type:', task.type);
        return false;
    }
  } catch (error) {
    console.error('[BackgroundSync] Sync failed:', task.id, error);
    return false;
  }
}

/**
 * Sync GPS location
 */
async function syncGpsLocation(task: SyncTask): Promise<boolean> {
  // This would call your API endpoint
  // For now, just return true
  console.log('[BackgroundSync] Syncing GPS location:', task.data);
  return true;
}

/**
 * Sync customer update
 */
async function syncCustomerUpdate(task: SyncTask): Promise<boolean> {
  console.log('[BackgroundSync] Syncing customer update:', task.data);
  return true;
}

/**
 * Sync route completion
 */
async function syncRouteCompletion(task: SyncTask): Promise<boolean> {
  console.log('[BackgroundSync] Syncing route completion:', task.data);
  return true;
}

/**
 * Sync form submission
 */
async function syncFormSubmission(task: SyncTask): Promise<boolean> {
  console.log('[BackgroundSync] Syncing form submission:', task.data);
  return true;
}

/**
 * Remove task from queue
 */
export function removeTask(taskId: string) {
  const queue = getQueue();
  const filtered = queue.filter((task) => task.id !== taskId);
  saveQueue(filtered);
}

/**
 * Request background sync
 */
async function requestBackgroundSync(tag: string) {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.warn('[BackgroundSync] Background Sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(tag);
    console.log('[BackgroundSync] Sync registered:', tag);
  } catch (error) {
    console.error('[BackgroundSync] Failed to register sync:', error);
  }
}

/**
 * Trigger sync manually
 */
export async function triggerSync(tag: string) {
  console.log('[BackgroundSync] Triggering sync:', tag);

  if (navigator.onLine) {
    await syncOfflineQueue();
  } else {
    console.log('[BackgroundSync] Offline, queueing sync for later');
    await requestBackgroundSync(tag);
  }
}

/**
 * Update sync metadata
 */
function updateSyncMetadata() {
  const queue = getQueue();
  const metadata = {
    totalTasks: queue.length,
    lastUpdated: Date.now(),
    byType: {
      'gps-location': queue.filter((t) => t.type === 'gps-location').length,
      'customer-update': queue.filter((t) => t.type === 'customer-update').length,
      'route-completion': queue.filter((t) => t.type === 'route-completion').length,
      'form-submission': queue.filter((t) => t.type === 'form-submission').length,
    },
  };

  try {
    localStorage.setItem(SYNC_METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    console.error('[BackgroundSync] Failed to update metadata:', error);
  }
}

/**
 * Get sync metadata
 */
export function getSyncMetadata() {
  try {
    const data = localStorage.getItem(SYNC_METADATA_KEY);
    return data
      ? JSON.parse(data)
      : {
          totalTasks: 0,
          lastUpdated: null,
          byType: {
            'gps-location': 0,
            'customer-update': 0,
            'route-completion': 0,
            'form-submission': 0,
          },
        };
  } catch (error) {
    console.error('[BackgroundSync] Failed to get metadata:', error);
    return null;
  }
}

/**
 * Hook to listen for sync events
 */
export function useSyncListener(callback: (results: any) => void) {
  useEffect(() => {
    const handleSync = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener('sync-complete', handleSync);
    return () => window.removeEventListener('sync-complete', handleSync);
  }, [callback]);
}

// Import useEffect for the hook
import { useEffect } from 'react';

