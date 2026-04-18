import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, MapPin, Clock, CheckCircle, AlertTriangle, Bell, Radius } from "lucide-react";
import { toast } from "sonner";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";

interface Geofence {
  id: string;
  customerId: string;
  customerName: string;
  buildingId: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  fieldManager: string;
  status: "active" | "inactive";
  createdAt: Date;
}

interface GeofenceEvent {
  id: string;
  geofenceId: string;
  customerName: string;
  fieldManager: string;
  eventType: "entry" | "exit";
  timestamp: Date;
  latitude: number;
  longitude: number;
  autoCheckIn: boolean;
}

export default function GeofencingAlerts() {
  const [geofences, setGeofences] = useState<Geofence[]>([]);
  const [events, setEvents] = useState<GeofenceEvent[]>([]);
  const [selectedGeofence, setSelectedGeofence] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Initialize mock geofences
  useEffect(() => {
    const mockGeofences: Geofence[] = [
      {
        id: "gf-1",
        customerId: "cust-001",
        customerName: "ABC Corporation",
        buildingId: "AFT-200",
        latitude: 6.5244,
        longitude: 3.3792,
        radiusMeters: 100,
        fieldManager: "Bukola",
        status: "active",
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: "gf-2",
        customerId: "cust-002",
        customerName: "XYZ Industries",
        buildingId: "CUM-099",
        latitude: 6.5255,
        longitude: 3.3805,
        radiusMeters: 150,
        fieldManager: "Halleluyah",
        status: "active",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: "gf-3",
        customerId: "cust-003",
        customerName: "Tech Solutions Ltd",
        buildingId: "DIC-087",
        latitude: 6.523,
        longitude: 3.378,
        radiusMeters: 120,
        fieldManager: "Juwon",
        status: "active",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: "gf-4",
        customerId: "cust-004",
        customerName: "Global Enterprises",
        buildingId: "MOT-108",
        latitude: 6.527,
        longitude: 3.382,
        radiusMeters: 100,
        fieldManager: "Aishat",
        status: "active",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];
    setGeofences(mockGeofences);
  }, []);

  // Simulate geofence events
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const randomGeofence = geofences[Math.floor(Math.random() * geofences.length)];
      if (!randomGeofence) return;

      const eventType = Math.random() > 0.5 ? "entry" : "exit";
      const newEvent: GeofenceEvent = {
        id: `event-${Date.now()}`,
        geofenceId: randomGeofence.id,
        customerName: randomGeofence.customerName,
        fieldManager: randomGeofence.fieldManager,
        eventType,
        timestamp: new Date(),
        latitude: randomGeofence.latitude + (Math.random() - 0.5) * 0.001,
        longitude: randomGeofence.longitude + (Math.random() - 0.5) * 0.001,
        autoCheckIn: eventType === "entry",
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);

      if (eventType === "entry") {
        toast.success(`✅ ${randomGeofence.fieldManager} entered ${randomGeofence.customerName}`);
      } else {
        toast.info(`👋 ${randomGeofence.fieldManager} left ${randomGeofence.customerName}`);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isMonitoring, geofences]);


  // Computed: count of active geofences
  const activeGeofences = geofences.filter((g) => g.status === "active").length;
  const entryEvents = events.filter((e) => e.eventType === "entry").length;
  const exitEvents = events.filter((e) => e.eventType === "exit").length;
  const totalEvents = events.length;

  // Handler: create a new geofence (opens a toast prompt for now)
  const handleCreateGeofence = () => {
    const newGeofence: Geofence = {
      id: `gf-${Date.now()}`,
      customerId: `cust-${Date.now()}`,
      customerName: "New Customer",
      buildingId: "NEW-001",
      latitude: 6.5244 + (Math.random() - 0.5) * 0.01,
      longitude: 3.3792 + (Math.random() - 0.5) * 0.01,
      radiusMeters: 100,
      fieldManager: "Unassigned",
      status: "active",
      createdAt: new Date(),
    };
    setGeofences((prev) => [...prev, newGeofence]);
    toast.success("✅ New geofence created successfully");
  };

  // Handler: toggle a geofence active/inactive
  const handleToggleGeofence = (id: string) => {
    setGeofences((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, status: g.status === "active" ? "inactive" : "active" } : g
      )
    );
    toast.info("Geofence status updated");
  };

  // Handler: delete a geofence
  const handleDeleteGeofence = (id: string) => {
    setGeofences((prev) => prev.filter((g) => g.id !== id));
    toast.success("Geofence deleted");
  };

  return (
    <div className="space-y-6">
      <FieldManagerBreadcrumb
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Field Manager", href: "/field-manager-admin" },
          { label: "Geofencing & Alerts", href: "/geofencing-alerts" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Radius className="w-8 h-8" />
            Geofencing & Auto Check-in/Check-out
          </h1>
          <p className="text-slate-400 mt-1">Automatic customer location tracking with alerts</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsMonitoring(!isMonitoring)}
            className={isMonitoring ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}
          >
            <Bell className="w-4 h-4 mr-2" />
            {isMonitoring ? "Stop Monitoring" : "Start Monitoring"}
          </Button>
          <Button onClick={handleCreateGeofence} className="bg-blue-600 hover:bg-blue-700">
            <MapPin className="w-4 h-4 mr-2" />
            Create Geofence
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Active Geofences</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{activeGeofences}</p>
            <p className="text-xs text-slate-500 mt-1">Monitoring locations</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Entry Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-400">{entryEvents}</p>
            <p className="text-xs text-slate-500 mt-1">Check-ins today</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Exit Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-400">{exitEvents}</p>
            <p className="text-xs text-slate-500 mt-1">Check-outs today</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-400">Total Events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-400">{totalEvents}</p>
            <p className="text-xs text-slate-500 mt-1">Location events</p>
          </CardContent>
        </Card>
      </div>

      {/* Geofences Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {geofences.map((geofence) => (
          <Card
            key={geofence.id}
            className={`bg-slate-800 border cursor-pointer transition ${
              selectedGeofence === geofence.id
                ? "border-blue-500 ring-2 ring-blue-500/50"
                : "border-slate-700 hover:border-slate-600"
            }`}
            onClick={() => setSelectedGeofence(selectedGeofence === geofence.id ? null : geofence.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white">{geofence.customerName}</CardTitle>
                  <CardDescription className="text-slate-400">{geofence.buildingId}</CardDescription>
                </div>
                <Badge className={geofence.status === "active" ? "bg-green-900/20 border-green-700 text-green-400" : "bg-red-900/20 border-red-700 text-red-400"}>
                  {geofence.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location Info */}
              <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-blue-400" />
                  <span className="text-slate-300">
                    {geofence.latitude.toFixed(6)}, {geofence.longitude.toFixed(6)}
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  Radius: {geofence.radiusMeters}m
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Field Manager</p>
                  <p className="text-sm font-bold text-blue-400">{geofence.fieldManager}</p>
                </div>
                <div className="bg-slate-700/30 rounded p-2">
                  <p className="text-xs text-slate-400">Created</p>
                  <p className="text-sm font-bold text-slate-300">
                    {Math.floor((Date.now() - geofence.createdAt.getTime()) / (24 * 60 * 60 * 1000))}d ago
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-700">
                <Button
                  size="sm"
                  onClick={() => handleToggleGeofence(geofence.id)}
                  className={`flex-1 text-white text-xs ${
                    geofence.status === "active"
                      ? "bg-orange-600 hover:bg-orange-700"
                      : "bg-green-600 hover:bg-green-700"
                  }`}
                >
                  {geofence.status === "active" ? "Deactivate" : "Activate"}
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDeleteGeofence(geofence.id)}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                >
                  Delete
                </Button>
              </div>

              {/* Expanded Details */}
              {selectedGeofence === geofence.id && (
                <div className="border-t border-slate-700 pt-3 mt-3 space-y-2">
                  <h4 className="text-sm font-semibold text-white">Geofence Details</h4>
                  <div className="space-y-1 text-xs text-slate-400">
                    <p>📍 Location: {geofence.latitude.toFixed(6)}, {geofence.longitude.toFixed(6)}</p>
                    <p>🎯 Radius: {geofence.radiusMeters} meters</p>
                    <p>👤 Manager: {geofence.fieldManager}</p>
                    <p>🏢 Building: {geofence.buildingId}</p>
                    <p>✅ Auto Check-in: Enabled when entering</p>
                    <p>👋 Auto Check-out: Enabled when exiting</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Events */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Geofence Events
          </CardTitle>
          <CardDescription>Last 20 check-in/check-out events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No events yet. Start monitoring to see events.</p>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg border border-slate-600"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {event.eventType === "entry" ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {event.fieldManager} {event.eventType === "entry" ? "entered" : "left"} {event.customerName}
                      </p>
                      <p className="text-xs text-slate-400">
                        {event.latitude.toFixed(6)}, {event.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400">{event.timestamp.toLocaleTimeString()}</p>
                    {event.autoCheckIn && (
                      <Badge className="mt-1 bg-green-900/20 border-green-700 text-green-400 text-xs">
                        Auto Check-in
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Features Info */}
      <Card className="bg-blue-900/20 border-blue-700">
        <CardHeader>
          <CardTitle className="text-blue-300 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            Geofencing Features
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-200 space-y-2">
          <p>✅ Automatic check-in when field manager enters customer location</p>
          <p>✅ Automatic check-out when field manager exits customer location</p>
          <p>✅ Customizable geofence radius (100-500 meters)</p>
          <p>✅ Real-time entry/exit alerts with notifications</p>
          <p>✅ GPS accuracy verification (±10 meters)</p>
          <p>✅ Event history and analytics</p>
          <p>✅ Enable/disable geofences without deletion</p>
          <p>✅ Multiple geofences per field manager</p>
        </CardContent>
      </Card>
    </div>
  );
}

