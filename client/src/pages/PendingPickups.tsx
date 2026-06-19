import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Clock,
  CheckCircle,
  WifiOff,
  Wifi,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import {
  getAllQueuedPickups,
  removeQueuedPickup,
  syncPickupQueue,
  type QueuedPickup,
} from "@/lib/pickupQueue";
import { trpc } from "@/lib/trpc";

export default function PendingPickups() {
  const [pickups, setPickups] = useState<QueuedPickup[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const markPicked = trpc.workerAuth.markCustomerPicked.useMutation();

  const loadPickups = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAllQueuedPickups();
      // Show pending and failed; exclude syncing (in-flight)
      setPickups(all.filter((p) => p.status === "pending" || p.status === "failed"));
    } catch {
      toast.error("Failed to load queued pickups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPickups();
    const handleOnline = () => { setIsOnline(true); loadPickups(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [loadPickups]);

  const handleSyncAll = async () => {
    if (!isOnline) {
      toast.error("You are offline. Connect to the internet to sync.");
      return;
    }
    setSyncing(true);
    try {
      const { synced, failed } = await syncPickupQueue(async (routeId, customerId) => {
        await markPicked.mutateAsync({ routeId, customerId });
      });
      if (synced > 0) toast.success(`${synced} pickup${synced > 1 ? "s" : ""} submitted successfully.`);
      if (failed > 0) toast.error(`${failed} pickup${failed > 1 ? "s" : ""} failed to submit.`);
      await loadPickups();
    } catch {
      toast.error("Sync failed. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = async (id: number) => {
    try {
      await removeQueuedPickup(id);
      setPickups((prev) => prev.filter((p) => p.id !== id));
      toast.success("Pickup removed from queue.");
    } catch {
      toast.error("Failed to remove pickup.");
    }
  };

  const formatDate = (ts: number) =>
    new Date(ts).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-slate-800 px-4 py-4 flex items-center gap-3 border-b border-slate-700">
        <Link href="/worker-mobile/routes">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">Pending Pickups</h1>
          <p className="text-xs text-slate-400">Queued offline submissions</p>
        </div>
        {/* Online indicator */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
          isOnline ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Sync all button */}
        {pickups.length > 0 && (
          <Button
            onClick={handleSyncAll}
            disabled={syncing || !isOnline}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncing ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Syncing…</>
            ) : (
              <><RefreshCw className="w-4 h-4 mr-2" /> Retry All ({pickups.length})</>
            )}
          </Button>
        )}

        {/* Empty state */}
        {!loading && pickups.length === 0 && (
          <div className="text-center py-16">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">All caught up</h2>
            <p className="text-slate-400 text-sm">No pending or failed pickup submissions.</p>
          </div>
        )}

        {/* Pickup cards */}
        {pickups.map((pickup) => (
          <Card key={pickup.id} className="bg-slate-800 border-slate-700">
            <CardContent className="p-4 space-y-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{pickup.customerName || "Unknown Customer"}</p>
                  <p className="text-xs text-slate-400 truncate">{pickup.customerAddress || "—"}</p>
                </div>
                <Badge
                  className={
                    pickup.status === "failed"
                      ? "bg-red-500/20 text-red-400 border-red-500/30"
                      : "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                  }
                >
                  {pickup.status === "failed" ? (
                    <><AlertTriangle className="w-3 h-3 mr-1" /> Failed</>
                  ) : (
                    <><Clock className="w-3 h-3 mr-1" /> Pending</>
                  )}
                </Badge>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Bin type</span>
                  <p className="text-slate-300">{pickup.binType} × {pickup.binQuantity}</p>
                </div>
                <div>
                  <span className="text-slate-500">Billing</span>
                  <p className="text-slate-300 capitalize">{pickup.webhookType}</p>
                </div>
                <div>
                  <span className="text-slate-500">MAF code</span>
                  <p className="text-slate-300">{pickup.mafCode || "—"}</p>
                </div>
                <div>
                  <span className="text-slate-500">Queued at</span>
                  <p className="text-slate-300">{formatDate(pickup.queuedAt)}</p>
                </div>
              </div>

              {/* Error message */}
              {pickup.status === "failed" && pickup.lastError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  <p className="text-red-400 text-xs">{pickup.lastError}</p>
                  {pickup.retries > 0 && (
                    <p className="text-red-500/70 text-xs mt-0.5">Attempted {pickup.retries} time{pickup.retries > 1 ? "s" : ""}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => handleDismiss(pickup.id!)}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Dismiss
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={syncing || !isOnline}
                  onClick={handleSyncAll}
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
