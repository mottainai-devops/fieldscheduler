import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Users, RefreshCw, UserCheck, UserCog } from "lucide-react";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";
import { trpc } from "@/lib/trpc";

/**
 * T56b correction: TrackedWorker (replaces the old simulation interface).
 * Tracks both field managers and supervisors (role-scoped by server).
 */
interface TrackedWorker {
  id: number;
  name: string;
  role: string;
  currentLatitude: string | null;
  currentLongitude: string | null;
  lastLocationUpdate: Date | null;
}

/** Returns a human-readable role label for display */
function getRoleLabel(role: string): string {
  if (role === "field_manager") return "Field Manager";
  if (role === "supervisor") return "Supervisor";
  return role;
}

/** Returns Tailwind badge classes for the role badge */
function getRoleBadgeClass(role: string): string {
  if (role === "field_manager") return "bg-blue-900/20 border-blue-700 text-blue-400";
  if (role === "supervisor") return "bg-purple-900/20 border-purple-700 text-purple-400";
  return "bg-slate-700 border-slate-600 text-slate-300";
}

/** Returns the role icon component */
function RoleIcon({ role, className }: { role: string; className?: string }) {
  if (role === "field_manager") return <UserCog className={className} />;
  return <UserCheck className={className} />;
}

export default function RealTimeTracking() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);

  // T56b correction: live DB query replacing simulation
  const {
    data: trackedWorkers = [],
    isLoading,
    error,
    refetch,
    dataUpdatedAt,
  } = trpc.fieldWorker.getTrackedWorkers.useQuery(undefined, {
    refetchInterval: 30_000, // poll every 30s — GPS pipeline (T56c) will push updates
  });

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt) : null;

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapLoaded) return;
    if ((window as any).L) {
      initMap();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      initMap();
    };
    document.head.appendChild(script);

    function initMap() {
      const L = (window as any).L;
      if (!mapContainerRef.current || mapRef.current) return;
      mapRef.current = L.map(mapContainerRef.current).setView([6.5244, 3.3792], 13);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(mapRef.current);
      setMapLoaded(true);
    }
  }, [mapContainerRef]);

  // Update map markers whenever tracked workers change
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const L = (window as any).L;

    const roleColorMap: Record<string, string> = {
      field_manager: "#3b82f6",  // blue
      supervisor: "#a855f7",     // purple
    };

    // Remove markers for workers no longer in the list
    const currentIds = new Set(trackedWorkers.map((w) => String(w.id)));
    for (const markerId of Object.keys(markersRef.current)) {
      if (!currentIds.has(markerId)) {
        markersRef.current[markerId].remove();
        delete markersRef.current[markerId];
      }
    }

    trackedWorkers.forEach((worker) => {
      if (!worker.currentLatitude || !worker.currentLongitude) return;
      const lat = parseFloat(worker.currentLatitude);
      const lng = parseFloat(worker.currentLongitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const color = roleColorMap[worker.role] || "#94a3b8";
      const roleLabel = getRoleLabel(worker.role);

      const icon = L.divIcon({
        html: `<div style="
          background: ${color};
          border: 3px solid white;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          color: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
          cursor: pointer;
        ">${worker.name.charAt(0)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
        className: "",
      });

      const lastSeen = worker.lastLocationUpdate
        ? new Date(worker.lastLocationUpdate).toLocaleTimeString()
        : "Unknown";

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 4px;">${worker.name}</div>
          <div style="color: ${color}; font-size: 12px; margin-bottom: 4px;">● ${roleLabel}</div>
          <div style="font-size: 12px; color: #555;">
            <div>Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}</div>
            <div style="margin-top: 4px; color: #888; font-size: 11px;">Last seen: ${lastSeen}</div>
          </div>
        </div>
      `;

      if (markersRef.current[String(worker.id)]) {
        markersRef.current[String(worker.id)].setLatLng([lat, lng]);
        markersRef.current[String(worker.id)].setIcon(icon);
        markersRef.current[String(worker.id)].setPopupContent(popupContent);
      } else {
        const marker = L.marker([lat, lng], { icon })
          .bindPopup(popupContent)
          .addTo(mapRef.current);
        markersRef.current[String(worker.id)] = marker;
      }
    });
  }, [trackedWorkers, mapLoaded]);

  const isEmpty = !isLoading && !error && trackedWorkers.length === 0;

  return (
    <div className="space-y-6">
      <FieldManagerBreadcrumb
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Real-Time Tracking", href: "/real-time-tracking" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Team Locations</h1>
          <p className="text-slate-400 mt-1">Live GPS tracking — field managers and supervisors</p>
        </div>
        <Button
          variant="outline"
          className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Last Update Info */}
      {lastUpdate && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <p className="text-sm text-slate-400">
            Last fetched: {lastUpdate.toLocaleTimeString()} · Auto-refreshes every 30 seconds
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-4">
          <p className="text-sm text-red-300">
            Failed to load tracking data. Please refresh to try again.
          </p>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Loading team locations…</p>
        </div>
      )}

      {/* Empty state */}
      {isEmpty && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center space-y-3">
          <MapPin className="w-8 h-8 text-slate-500 mx-auto" />
          <div>
            <p className="text-slate-300 font-medium">No workers currently tracked</p>
            <p className="text-slate-500 text-sm mt-1">
              Locations appear here when the mobile app sends GPS coordinates.
              Your team's live positions will show up once the GPS pipeline is active.
            </p>
          </div>
        </div>
      )}

      {/* Tracking Grid */}
      {trackedWorkers.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {trackedWorkers.map((worker) => (
            <Card
              key={worker.id}
              className={`bg-slate-800 border cursor-pointer transition ${
                selectedWorker === worker.id
                  ? "border-blue-500 ring-2 ring-blue-500/50"
                  : "border-slate-700 hover:border-slate-600"
              }`}
              onClick={() => setSelectedWorker(selectedWorker === worker.id ? null : worker.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                      <RoleIcon role={worker.role} className="w-5 h-5 text-slate-300" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{worker.name}</CardTitle>
                      <Badge className={`mt-1 ${getRoleBadgeClass(worker.role)}`}>
                        {getRoleLabel(worker.role)}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500" title="GPS active" />
                    <span className="text-xs text-slate-400">Live</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Location Info */}
                <div className="bg-slate-700/50 rounded-lg p-3 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-blue-400" />
                    <span className="text-slate-300 font-mono text-xs">
                      {worker.currentLatitude
                        ? `${parseFloat(worker.currentLatitude).toFixed(5)}, ${parseFloat(worker.currentLongitude!).toFixed(5)}`
                        : "No GPS data"}
                    </span>
                  </div>
                  {worker.lastLocationUpdate && (
                    <div className="text-xs text-slate-500 pl-6">
                      Last update: {new Date(worker.lastLocationUpdate).toLocaleTimeString()}
                    </div>
                  )}
                </div>

                {/* Expanded Details */}
                {selectedWorker === worker.id && (
                  <div className="border-t border-slate-700 pt-3 space-y-1">
                    <h4 className="text-sm font-semibold text-white">Details</h4>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p>👤 Role: {getRoleLabel(worker.role)}</p>
                      <p>📍 Latitude: {worker.currentLatitude}</p>
                      <p>📍 Longitude: {worker.currentLongitude}</p>
                      {worker.lastLocationUpdate && (
                        <p>🕐 Last GPS update: {new Date(worker.lastLocationUpdate).toLocaleString()}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Live Map View */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Live Map View
          </CardTitle>
          <CardDescription>
            {trackedWorkers.length > 0
              ? `${trackedWorkers.length} worker${trackedWorkers.length !== 1 ? "s" : ""} on map — click a marker for details`
              : "Map will show worker positions once GPS data is available"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-lg relative">
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "480px" }}
          />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-700 rounded-b-lg">
              <p className="text-slate-400 text-sm">Loading map…</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> This page shows live GPS data from the mobile app.
          Field managers and supervisors appear here when their device sends a location update.
          GPS transmission will be active once the mobile GPS pipeline ships (T56c).
        </p>
      </div>
    </div>
  );
}
