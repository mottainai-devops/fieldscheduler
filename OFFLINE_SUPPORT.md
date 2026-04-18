# Offline Support Implementation Guide

## Overview

This document describes the offline support infrastructure that has been implemented for the Field Worker Scheduler mobile app.

## ✅ What's Been Implemented

### 1. IndexedDB Storage Layer (`client/src/lib/offlineStorage.ts`)

A complete IndexedDB wrapper that provides:

- **Routes Storage**: Cache entire routes with all customer data
- **Customers Storage**: Store individual customer records with status
- **Pending Updates Queue**: Queue for offline actions waiting to sync
- **GPS Logs**: Buffer GPS coordinates when offline

**Key Features:**
- Automatic database initialization
- Indexed queries for fast lookups
- Worker-specific route filtering
- Status-based customer filtering

### 2. Offline Queue Manager (`client/src/lib/offlineQueue.ts`)

Manages synchronization of offline data:

- **Queue Management**: Add updates to queue when offline
- **Auto-Retry Logic**: Retry failed syncs up to 5 times
- **Background Sync**: Automatic sync every 30 seconds when online
- **GPS Buffering**: Queue GPS logs for batch upload

**Supported Update Types:**
- Customer status changes
- Route status updates
- Customer notes
- GPS location logs

### 3. React Hooks (`client/src/hooks/useOfflineSync.ts`)

React hooks for easy integration:

- **`useOfflineSync()`**: Monitor online/offline status, pending count, and trigger manual sync
- **`useOfflineRoutes()`**: Cache and retrieve routes from IndexedDB

## 🔧 Integration Steps

To fully enable offline support, integrate these components into the Worker Mobile app:

### Step 1: Add Offline Sync Hook to WorkerMobile.tsx

```tsx
import { useOfflineSync, useOfflineRoutes } from "@/hooks/useOfflineSync";

export default function WorkerMobile() {
  const { isOnline, pendingCount, isSyncing, syncNow } = useOfflineSync();
  const { cachedRoutes, cacheRoutes } = useOfflineRoutes(selectedWorkerId);
  
  // ... rest of component
}
```

### Step 2: Cache Routes When Fetched

```tsx
const { data: routes = [], isLoading } = trpc.fieldWorker.getRoutes.useQuery();

useEffect(() => {
  if (routes.length > 0 && isOnline) {
    // Cache routes for offline access
    cacheRoutes(routes);
  }
}, [routes, isOnline]);
```

### Step 3: Use Cached Routes When Offline

```tsx
const displayRoutes = isOnline ? routes : cachedRoutes;
```

### Step 4: Queue Updates When Offline

```tsx
import { offlineQueue } from "@/lib/offlineQueue";

const handleMarkComplete = async (customerId: number) => {
  if (isOnline) {
    // Normal online flow
    await updateCustomerStatus.mutateAsync({
      routeCustomerId: customerId,
      status: "completed",
    });
  } else {
    // Queue for offline sync
    await offlineQueue.queueCustomerStatusUpdate({
      routeCustomerId: customerId,
      status: "completed",
      arrivalTime: new Date().toISOString(),
    });
  }
};
```

### Step 5: Add Offline Indicator UI

```tsx
{!isOnline && (
  <div className="bg-yellow-500 text-white px-4 py-2 text-sm">
    <WifiOff className="inline mr-2 h-4 w-4" />
    Offline Mode - {pendingCount} updates pending
  </div>
)}

{isSyncing && (
  <div className="bg-blue-500 text-white px-4 py-2 text-sm">
    Syncing {pendingCount} updates...
  </div>
)}
```

## 📋 TODO: Backend Integration

The offline queue currently logs updates but doesn't call the actual tRPC mutations. Update `client/src/lib/offlineQueue.ts` to call real endpoints:

```tsx
// In processPendingUpdate()
case "customer_status":
  await trpc.fieldWorker.updateCustomerStatus.mutate(update.data);
  break;

case "route_status":
  await trpc.fieldWorker.updateRouteStatus.mutate(update.data);
  break;
```

## 🎯 Benefits

Once fully integrated, workers will be able to:

- ✅ **View routes offline**: Access cached route and customer data
- ✅ **Mark customers complete offline**: Updates queued and synced later
- ✅ **Track GPS offline**: Location logs buffered and uploaded in batch
- ✅ **Auto-sync when online**: Seamless sync when connection returns
- ✅ **See pending updates**: Visual indicator of queued changes
- ✅ **Manual sync trigger**: Force sync with a button press

## 🔒 Data Persistence

- **Routes**: Cached until manually cleared or 30 days
- **Pending Updates**: Kept until successfully synced or max retries (5) reached
- **GPS Logs**: Kept until marked as synced
- **Worker Auth**: Persisted in localStorage for 30 days

## 🧹 Cleanup

When worker logs out:

```tsx
import { offlineStorage } from "@/lib/offlineStorage";

const handleLogout = async () => {
  await offlineStorage.clearAll();
  localStorage.clear();
};
```

## 📊 Testing Offline Mode

1. Open Chrome DevTools → Network tab
2. Set throttling to "Offline"
3. Verify routes are still visible (from cache)
4. Mark a customer complete
5. Check pending count increases
6. Set throttling back to "Online"
7. Verify auto-sync occurs and pending count drops to 0

## 🚀 Next Steps

1. Integrate hooks into WorkerMobile.tsx
2. Add offline UI indicators
3. Connect queue to real tRPC mutations
4. Test thoroughly with real field workers
5. Monitor sync success rates and adjust retry logic if needed

