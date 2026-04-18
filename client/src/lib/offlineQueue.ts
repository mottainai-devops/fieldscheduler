/**
 * Offline queue manager
 * Handles queuing and syncing of offline updates
 */

import { offlineStorage, type PendingUpdate } from "./offlineStorage";
import { trpc } from "./trpc";

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // 2 seconds

class OfflineQueue {
  private isSyncing = false;
  private syncCallbacks: Array<() => void> = [];

  /**
   * Add a customer status update to the offline queue
   */
  async queueCustomerStatusUpdate(data: {
    routeCustomerId: number;
    status: string;
    arrivalTime?: string;
    departureTime?: string;
    notes?: string;
  }): Promise<void> {
    await offlineStorage.addPendingUpdate({
      type: "customer_status",
      data,
      timestamp: Date.now(),
      retries: 0,
    });

    // Also update local IndexedDB immediately for UI consistency
    await offlineStorage.updateCustomerStatus(
      data.routeCustomerId,
      data.status,
      data.arrivalTime,
      data.departureTime
    );

    // Try to sync if online
    if (navigator.onLine) {
      this.syncPendingUpdates();
    }
  }

  /**
   * Add a GPS log to the offline queue
   */
  async queueGPSLog(data: {
    workerId: number;
    latitude: number;
    longitude: number;
  }): Promise<void> {
    await offlineStorage.addGPSLog({
      ...data,
      timestamp: Date.now(),
      synced: false,
    });

    // Try to sync if online
    if (navigator.onLine) {
      this.syncGPSLogs();
    }
  }

  /**
   * Add a route status update to the offline queue
   */
  async queueRouteStatusUpdate(data: {
    routeId: number;
    status: string;
    startTime?: string;
    endTime?: string;
  }): Promise<void> {
    await offlineStorage.addPendingUpdate({
      type: "route_status",
      data,
      timestamp: Date.now(),
      retries: 0,
    });

    // Try to sync if online
    if (navigator.onLine) {
      this.syncPendingUpdates();
    }
  }

  /**
   * Sync all pending updates to the server
   */
  async syncPendingUpdates(): Promise<void> {
    if (this.isSyncing || !navigator.onLine) {
      return;
    }

    this.isSyncing = true;

    try {
      const pendingUpdates = await offlineStorage.getPendingUpdates();

      for (const update of pendingUpdates) {
        try {
          await this.processPendingUpdate(update);
          await offlineStorage.removePendingUpdate(update.id!);
        } catch (error) {
          console.error("Failed to sync update:", error);
          
          // Increment retry count
          const newRetries = update.retries + 1;
          
          if (newRetries >= MAX_RETRIES) {
            // Max retries reached, remove from queue
            console.error("Max retries reached for update:", update);
            await offlineStorage.removePendingUpdate(update.id!);
          } else {
            // Update retry count
            await offlineStorage.updatePendingUpdateRetries(update.id!, newRetries);
          }
        }
      }

      // Notify listeners that sync is complete
      this.syncCallbacks.forEach((cb) => cb());
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync GPS logs to the server
   */
  async syncGPSLogs(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      const unsyncedLogs = await offlineStorage.getUnsyncedGPSLogs();

      for (const log of unsyncedLogs) {
        try {
          // TODO: Call tRPC mutation to save GPS log
          // await trpc.fieldWorker.logGPS.mutate({
          //   workerId: log.workerId,
          //   latitude: log.latitude,
          //   longitude: log.longitude,
          //   timestamp: new Date(log.timestamp).toISOString(),
          // });

          await offlineStorage.markGPSLogSynced(log.id!);
        } catch (error) {
          console.error("Failed to sync GPS log:", error);
        }
      }
    } catch (error) {
      console.error("Failed to sync GPS logs:", error);
    }
  }

  /**
   * Process a single pending update
   */
  private async processPendingUpdate(update: PendingUpdate): Promise<void> {
    switch (update.type) {
      case "customer_status":
        // TODO: Call tRPC mutation
        // await trpc.fieldWorker.updateCustomerStatus.mutate(update.data);
        console.log("Syncing customer status:", update.data);
        break;

      case "route_status":
        // TODO: Call tRPC mutation
        // await trpc.fieldWorker.updateRouteStatus.mutate(update.data);
        console.log("Syncing route status:", update.data);
        break;

      case "customer_note":
        // TODO: Call tRPC mutation
        // await trpc.fieldWorker.updateCustomerNote.mutate(update.data);
        console.log("Syncing customer note:", update.data);
        break;

      default:
        console.warn("Unknown update type:", update.type);
    }
  }

  /**
   * Get count of pending updates
   */
  async getPendingCount(): Promise<number> {
    const updates = await offlineStorage.getPendingUpdates();
    return updates.length;
  }

  /**
   * Register a callback to be called when sync completes
   */
  onSyncComplete(callback: () => void): void {
    this.syncCallbacks.push(callback);
  }

  /**
   * Start auto-sync interval (checks every 30 seconds)
   */
  startAutoSync(): void {
    setInterval(() => {
      if (navigator.onLine) {
        this.syncPendingUpdates();
        this.syncGPSLogs();
      }
    }, 30000); // 30 seconds
  }
}

export const offlineQueue = new OfflineQueue();

