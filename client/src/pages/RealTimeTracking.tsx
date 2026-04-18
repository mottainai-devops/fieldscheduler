import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Users, AlertCircle, RefreshCw } from "lucide-react";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";

interface GPSLocation {
  latitude: number;
  longitude: number;
  timestamp: Date;
  accuracy: number;
}

interface FieldManagerTracking {
  id: string;
  name: string;
  currentLocation: GPSLocation;
  status: "active" | "idle" | "offline";
  routeProgress: number;
  customersVisited: number;
  totalCustomers: number;
  distanceTraveled: number;
  estimatedTimeRemaining: number;
}

// Helper: returns emoji icon for field manager status
function getStatusIcon(status: string): string {
  if (status === "active") return "🟢";
  if (status === "idle") return "🟡";
  return "🔴";
}

// Helper: returns Tailwind badge class for field manager status
function getStatusColor(status: string): string {
  if (status === "active") return "bg-green-900/20 border-green-700 text-green-400";
  if (status === "idle") return "bg-yellow-900/20 border-yellow-700 text-yellow-400";
  return "bg-red-900/20 border-red-700 text-red-400";
}
// Helper: formats minutes into Xh Ym string
function formatTime(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function RealTimeTracking() {
  const [managers, setManagers] = useState<FieldManagerTracking[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedManager, setSelectedManager] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Initialize mock tracking data
  useEffect(() => {
    const mockManagers: FieldManagerTracking[] = [
      {
        id: "1",
        name: "Bukola",
        currentLocation: {
          latitude: 6.5244,
          longitude: 3.3792,
          timestamp: new Date(),
          accuracy: 5,
        },
        status: "active",
        routeProgress: 65,
        customersVisited: 3,
        totalCustomers: 5,
        distanceTraveled: 12.5,
        estimatedTimeRemaining: 45,
      },
      {
        id: "2",
        name: "Halleluyah",
        currentLocation: {
          latitude: 6.5255,
          longitude: 3.3805,
          timestamp: new Date(),
          accuracy: 8,
        },
        status: "active",
        routeProgress: 45,
        customersVisited: 2,
        totalCustomers: 6,
        distanceTraveled: 8.3,
        estimatedTimeRemaining: 90,
      },
      {
        id: "3",
        name: "Juwon",
        currentLocation: {
          latitude: 6.5230,
          longitude: 3.3780,
          timestamp: new Date(),
          accuracy: 6,
        },
        status: "idle",
        routeProgress: 20,
        customersVisited: 1,
        totalCustomers: 6,
        distanceTraveled: 2.1,
        estimatedTimeRemaining: 150,
      },
      {
        id: "4",
        name: "Aishat",
        currentLocation: {
          latitude: 6.5270,
          longitude: 3.3820,
          timestamp: new Date(),
          accuracy: 7,
        },
        status: "active",
        routeProgress: 85,
        customersVisited: 2,
        totalCustomers: 3,
        distanceTraveled: 6.8,
        estimatedTimeRemaining: 20,
      },
    ];
    setManagers(mockManagers);
  }, []);

  // Simulate GPS updates
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setManagers((prev) =>
        prev.map((manager) => {
          const randomDelta = () => (Math.random() - 0.5) * 0.001;
          return {
            ...manager,
            currentLocation: {
              ...manager.currentLocation,
              latitude: manager.currentLocation.latitude + randomDelta(),
              longitude: manager.currentLocation.longitude + randomDelta(),
              timestamp: new Date(),
              accuracy: Math.random() * 10 + 3,
            },
            routeProgress: Math.min(100, manager.routeProgress + Math.random() * 2),
            distanceTraveled: manager.distanceTraveled + Math.random() * 0.5,
            estimatedTimeRemaining: Math.max(0, manager.estimatedTimeRemaining - 1),
          };
        })
      );
      setLastUpdate(new Date());
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  }, []);


  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapLoaded) return;
    // Load Leaflet from CDN (same pattern as RouteMap component)
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

  // Update markers whenever managers state changes
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return;
    const L = (window as any).L;

    const colorMap: Record<string, string> = {
      active: "#22c55e",
      idle: "#eab308",
      offline: "#ef4444",
    };

    managers.forEach((manager) => {
      const { latitude, longitude } = manager.currentLocation;
      const color = colorMap[manager.status] || "#94a3b8";

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
        ">${manager.name.charAt(0)}</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20],
        className: "",
      });

      const popupContent = `
        <div style="font-family: sans-serif; min-width: 180px;">
          <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">${manager.name}</div>
          <div style="color: ${color}; font-size: 12px; margin-bottom: 4px;">● ${manager.status.toUpperCase()}</div>
          <div style="font-size: 12px; color: #555;">
            <div>Route: ${Math.round(manager.routeProgress)}% complete</div>
            <div>Customers: ${manager.customersVisited}/${manager.totalCustomers}</div>
            <div>Distance: ${manager.distanceTraveled.toFixed(1)} km</div>
            <div>ETA: ${manager.estimatedTimeRemaining < 60 ? Math.round(manager.estimatedTimeRemaining) + "m" : Math.floor(manager.estimatedTimeRemaining / 60) + "h " + Math.round(manager.estimatedTimeRemaining % 60) + "m"}</div>
            <div style="margin-top: 4px; color: #888; font-size: 11px;">${latitude.toFixed(4)}, ${longitude.toFixed(4)}</div>
          </div>
        </div>
      `;

      if (markersRef.current[manager.id]) {
        // Update existing marker position
        markersRef.current[manager.id].setLatLng([latitude, longitude]);
        markersRef.current[manager.id].setIcon(icon);
        markersRef.current[manager.id].setPopupContent(popupContent);
      } else {
        // Create new marker
        const marker = L.marker([latitude, longitude], { icon })
          .bindPopup(popupContent)
          .addTo(mapRef.current);
        markersRef.current[manager.id] = marker;
      }
    });
  }, [managers, mapLoaded]);

  return (
    <div className="space-y-6">
      <FieldManagerBreadcrumb
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Field Manager", href: "/field-manager-admin" },
          { label: "Real-time Tracking", href: "/real-time-tracking" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Real-time Route Tracking</h1>
          <p className="text-slate-400 mt-1">Live GPS tracking from field managers' mobile phones</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsSimulating(!isSimulating)}
            className={isSimulating ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            <Navigation className="w-4 h-4 mr-2" />
            {isSimulating ? "Stop Simulation" : "Start Simulation"}
          </Button>
          <Button
            variant="outline"
            className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Last Update Info */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3 flex items-center gap-2">
        <Clock className="w-4 h-4 text-slate-400" />
        <p className="text-sm text-slate-400">
          Last updated: {lastUpdate.toLocaleTimeString()} | GPS data updates every 3 seconds when simulation is active
        </p>
      </div>

      {/* Tracking Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {managers.map((manager) => (
          <Card
            key={manager.id}
            className={`bg-slate-800 border cursor-pointer transition ${
              selectedManager === manager.id
                ? "border-blue-500 ring-2 ring-blue-500/50"
                : "border-slate-700 hover:border-slate-600"
            }`}
            onClick={() => setSelectedManager(selectedManager === manager.id ? null : manager.id)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getStatusIcon(manager.status)}</span>
                  <div>
                    <CardTitle className="text-white">{manager.name}</CardTitle>
                    <Badge className={`mt-1 ${getStatusColor(manager.status)}`}>
                      {manager.status.replace("_", " ")}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location Info */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">
                    {manager.currentLocation.latitude.toFixed(4)}, {manager.currentLocation.longitude.toFixed(4)}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Accuracy: ±{manager.currentLocation.accuracy.toFixed(1)}m
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-300">Route Progress</span>
                  <span className="text-sm font-semibold text-blue-400">{Math.round(manager.routeProgress)}%</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${manager.routeProgress}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Customers Visited</p>
                  <p className="text-lg font-bold text-green-400">
                    {manager.customersVisited}/{manager.totalCustomers}
                  </p>
                </div>
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Distance Traveled</p>
                  <p className="text-lg font-bold text-purple-400">{manager.distanceTraveled.toFixed(1)}km</p>
                </div>
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Time Remaining</p>
                  <p className="text-lg font-bold text-yellow-400">
                    {formatTime(manager.estimatedTimeRemaining)}
                  </p>
                </div>
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Last Update</p>
                  <p className="text-lg font-bold text-slate-300">
                    {manager.currentLocation.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Expanded Details */}
              {selectedManager === manager.id && (
                <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-white">Route Details</h4>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p>📍 Current Position: {manager.currentLocation.latitude.toFixed(6)}, {manager.currentLocation.longitude.toFixed(6)}</p>
                    <p>🎯 Route Efficiency: {Math.round(manager.routeProgress)}% complete</p>
                    <p>⏱️ Estimated Completion: {formatTime(manager.estimatedTimeRemaining)}</p>
                    <p>📊 Visit Rate: {((manager.customersVisited / manager.totalCustomers) * 100).toFixed(0)}% of assigned customers</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Live Map View */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Live Map View
          </CardTitle>
          <CardDescription>
            {managers.filter((m) => m.status === "active").length} active field managers on map — click a marker for details
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-hidden rounded-b-lg">
          <div
            ref={mapContainerRef}
            style={{ width: "100%", height: "480px" }}
          />
          {!mapLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-700 rounded-b-lg">
              <p className="text-slate-400 text-sm">Loading map...</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          <strong>Note:</strong> This system captures GPS data from field managers' mobile phones in real-time. 
          The simulation shows how live tracking updates appear. In production, GPS coordinates are sent from the mobile app 
          whenever a manager moves, allowing real-time route monitoring and optimization.
        </p>
      </div>
    </div>
  );
}

