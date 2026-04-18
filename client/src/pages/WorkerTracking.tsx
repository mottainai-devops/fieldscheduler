import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Battery, Signal, Clock, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import AppHeader from "@/components/AppHeader";

export default function WorkerTracking() {
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: routes = [] } = trpc.fieldWorker.getRoutes.useQuery();
  const { data: workerLocations = [] } = trpc.fieldWorker.getAllWorkerLocations.useQuery(
    undefined,
    {
      refetchInterval: 10000, // Refresh every 10 seconds for real-time updates
    }
  );
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const activeRoutes = routes.filter(r => r.status === "in_progress");
  const workersWithLocation = workers.map(worker => {
    const location = workerLocations.find(l => l.workerId === worker.id);
    const route = activeRoutes.find(r => r.workerId === worker.id);
    return { ...worker, location, route };
  });

  const selectedWorkerData = selectedWorker 
    ? workersWithLocation.find(w => w.id === selectedWorker)
    : null;

  const getBatteryColor = (level?: number) => {
    if (!level) return "text-slate-400";
    if (level > 50) return "text-green-400";
    if (level > 20) return "text-yellow-400";
    return "text-red-400";
  };

  const getSignalColor = (strength?: string) => {
    if (!strength) return "text-slate-400";
    if (strength === "excellent" || strength === "good") return "text-green-400";
    if (strength === "fair") return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Worker Tracking" subtitle="Real-time field worker monitoring" />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Worker List */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Active Workers ({workers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {workersWithLocation.map((worker) => (
                    <div
                      key={worker.id}
                      onClick={() => setSelectedWorker(worker.id)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedWorker === worker.id
                          ? "bg-blue-600/20 border border-blue-500"
                          : "bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white text-sm">{worker.name}</h3>
                        <span className={`w-2 h-2 rounded-full ${
                          worker.location ? "bg-green-400" : "bg-gray-400"
                        }`} />
                      </div>
                      
                      <div className="text-xs text-slate-400 space-y-1">
                        {worker.route ? (
                          <div className="flex items-center gap-1 text-blue-400">
                            <Navigation className="w-3 h-3" />
                            <span>On Route #{worker.route.id}</span>
                          </div>
                        ) : (
                          <div className="text-slate-500">No active route</div>
                        )}
                        
                        {worker.location && (
                          <div className="flex items-center gap-2">
                            <Battery className={`w-3 h-3 ${getBatteryColor(worker.location.batteryLevel || undefined)}`} />
                            <span>{worker.location.batteryLevel || "N/A"}%</span>
                            <Signal className={`w-3 h-3 ${getSignalColor(worker.location.signalStrength || undefined)}`} />
                            <span className="capitalize">{worker.location.signalStrength || "N/A"}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Worker Details */}
          <div className="lg:col-span-2">
            {!selectedWorkerData ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-20">
                  <div className="text-center text-slate-400">
                    <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a worker to view tracking details</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Worker Info Card */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">{selectedWorkerData.name}</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">{selectedWorkerData.email}</p>
                      </div>
                      <span className={`px-3 py-1 rounded text-sm ${
                        selectedWorkerData.status === "active" ? "bg-green-600/20 text-green-400" :
                        selectedWorkerData.status === "on_leave" ? "bg-yellow-600/20 text-yellow-400" :
                        "bg-gray-600/20 text-gray-400"
                      }`}>
                        {selectedWorkerData.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <Battery className={`w-6 h-6 mx-auto mb-1 ${getBatteryColor(selectedWorkerData.location?.batteryLevel || undefined)}`} />
                        <div className="text-lg font-bold text-white">
                          {selectedWorkerData.location?.batteryLevel || "N/A"}%
                        </div>
                        <div className="text-xs text-slate-400">Battery</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <Signal className={`w-6 h-6 mx-auto mb-1 ${getSignalColor(selectedWorkerData.location?.signalStrength || undefined)}`} />
                        <div className="text-lg font-bold text-white capitalize">
                          {selectedWorkerData.location?.signalStrength || "N/A"}
                        </div>
                        <div className="text-xs text-slate-400">Signal</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <MapPin className="w-6 h-6 mx-auto mb-1 text-blue-400" />
                        <div className="text-lg font-bold text-white">
                          {selectedWorkerData.location ? "Active" : "Offline"}
                        </div>
                        <div className="text-xs text-slate-400">GPS Status</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <Navigation className="w-6 h-6 mx-auto mb-1 text-purple-400" />
                        <div className="text-lg font-bold text-white">
                          {selectedWorkerData.route ? "On Route" : "Idle"}
                        </div>
                        <div className="text-xs text-slate-400">Status</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Location Card */}
                {selectedWorkerData.location && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Current Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-slate-700/30 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 text-slate-300 mb-2">
                          <MapPin className="w-4 h-4 text-blue-400" />
                          <span className="font-mono text-sm">
                            {selectedWorkerData.location.latitude}, {selectedWorkerData.location.longitude}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          Last updated: {new Date(selectedWorkerData.location.updatedAt).toLocaleString()}
                        </div>
                      </div>

                      {/* Mock Map Placeholder */}
                      <div className="bg-slate-700/30 rounded-lg h-64 flex items-center justify-center border border-slate-600">
                        <div className="text-center text-slate-400">
                          <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Interactive map would display here</p>
                          <p className="text-xs mt-1">Showing worker location and route</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Active Route Card */}
                {selectedWorkerData.route && (
                  <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                      <CardTitle className="text-white">Active Route</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                          <div>
                            <div className="font-medium text-white">Route #{selectedWorkerData.route.id}</div>
                            <div className="text-sm text-slate-400">
                              {selectedWorkerData.route.totalDistance || "0"}km • {selectedWorkerData.route.estimatedDuration || "0"}h
                            </div>
                          </div>
                          <Link href="/routes">
                            <Button size="sm" variant="outline" className="border-slate-600">
                              View Details
                            </Button>
                          </Link>
                        </div>
                        
                        {selectedWorkerData.route.efficiencyScore && (
                          <div className="p-3 bg-blue-600/10 border border-blue-600/30 rounded-lg">
                            <div className="flex items-center gap-2 text-blue-400">
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">
                                Route efficiency: {selectedWorkerData.route.efficiencyScore}%
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

