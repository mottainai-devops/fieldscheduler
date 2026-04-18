/**
 * React hook for offline sync management
 * Handles background sync, online/offline detection, and data caching
 */

import { useState, useEffect, useCallback } from "react";
import { offlineStorage } from "@/lib/offlineStorage";
import { offlineQueue } from "@/lib/offlineQueue";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Trigger sync when coming back online
      syncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Update pending count periodically
  useEffect(() => {
    const updatePendingCount = async () => {
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Start auto-sync on mount
  useEffect(() => {
    offlineQueue.startAutoSync();

    // Register callback for sync completion
    offlineQueue.onSyncComplete(() => {
      setIsSyncing(false);
      setPendingCount(0);
    });
  }, []);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      console.log("Cannot sync while offline");
      return;
    }

    setIsSyncing(true);
    try {
      await offlineQueue.syncPendingUpdates();
      await offlineQueue.syncGPSLogs();
      const count = await offlineQueue.getPendingCount();
      setPendingCount(count);
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    syncNow,
  };
}

/**
 * Hook for caching route data offline
 */
export function useOfflineRoutes(workerId: number | null) {
  const [cachedRoutes, setCachedRoutes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCachedRoutes = async () => {
      if (!workerId) {
        setCachedRoutes([]);
        setIsLoading(false);
        return;
      }

      try {
        await offlineStorage.init();
        const routes = await offlineStorage.getRoutesByWorker(workerId);
        setCachedRoutes(routes);
      } catch (error) {
        console.error("Failed to load cached routes:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCachedRoutes();
  }, [workerId]);

  const cacheRoute = useCallback(async (route: any) => {
    try {
      await offlineStorage.saveRoute(route);
      // Reload cached routes
      if (workerId) {
        const routes = await offlineStorage.getRoutesByWorker(workerId);
        setCachedRoutes(routes);
      }
    } catch (error) {
      console.error("Failed to cache route:", error);
    }
  }, [workerId]);

  const cacheRoutes = useCallback(async (routes: any[]) => {
    try {
      await Promise.all(routes.map((route) => offlineStorage.saveRoute(route)));
      // Reload cached routes
      if (workerId) {
        const updatedRoutes = await offlineStorage.getRoutesByWorker(workerId);
        setCachedRoutes(updatedRoutes);
      }
    } catch (error) {
      console.error("Failed to cache routes:", error);
    }
  }, [workerId]);

  return {
    cachedRoutes,
    isLoading,
    cacheRoute,
    cacheRoutes,
  };
}

