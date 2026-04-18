import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Clock, CheckCircle, AlertCircle, Zap, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { ListSkeleton } from "@/components/LoadingComponents";
import { ErrorState } from "@/components/ErrorComponents";

export default function Routes() {
  const { data: routes = [], isLoading, error, refetch } = trpc.fieldWorker.getRoutes.useQuery();
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const { data: routeDetails } = trpc.fieldWorker.getRouteDetails.useQuery(
    { id: selectedRoute! },
    { enabled: selectedRoute !== null }
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-600/20 text-yellow-400";
      case "optimized": return "bg-blue-600/20 text-blue-400";
      case "assigned": return "bg-purple-600/20 text-purple-400";
      case "in_progress": return "bg-green-600/20 text-green-400";
      case "completed": return "bg-gray-600/20 text-gray-400";
      case "cancelled": return "bg-red-600/20 text-red-400";
      default: return "bg-gray-600/20 text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="w-4 h-4" />;
      case "optimized": return <Zap className="w-4 h-4" />;
      case "assigned": return <MapPin className="w-4 h-4" />;
      case "in_progress": return <Navigation className="w-4 h-4" />;
      case "completed": return <CheckCircle className="w-4 h-4" />;
      case "cancelled": return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Routes" subtitle="Manage and track route assignments" />
      
      {/* Quick Actions */}
      <div className="container mx-auto px-6 pt-4">
        <div className="flex gap-3">
          <Button
            onClick={() => window.location.href = '/create-route'}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Target className="w-4 h-4 mr-2" />
            Create Route (Clustering)
          </Button>
          <Button
            onClick={() => window.location.href = '/area-route-creation'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <MapPin className="w-4 h-4 mr-2" />
            Create Route (Area Selection)
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route List */}
          <div className="lg:col-span-1">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">All Routes ({routes.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {error ? (
                  <ErrorState error={error} onRetry={refetch} compact />
                ) : isLoading ? (
                  <ListSkeleton items={6} />
                ) : routes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    No routes yet
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {routes.map((route) => (
                      <div
                        key={route.id}
                        onClick={() => setSelectedRoute(route.id)}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedRoute === route.id
                            ? "bg-blue-600/20 border border-blue-500"
                            : "bg-slate-700/30 border border-slate-600 hover:bg-slate-700/50"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white">Route #{route.id}</h3>
                          <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${getStatusColor(route.status)}`}>
                            {getStatusIcon(route.status)}
                            {route.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-slate-400 space-y-1">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3" />
                            <span>{route.worker?.name || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation className="w-3 h-3" />
                            <span>{route.customerCount || 0} stops</span>
                          </div>
                          {route.efficiencyScore && (
                            <div className="flex items-center gap-2">
                              <Target className="w-3 h-3" />
                              <span>{route.efficiencyScore}% efficiency</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Route Details */}
          <div className="lg:col-span-2">
            {selectedRoute === null || !routeDetails ? (
              <Card className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-20">
                  <div className="text-center text-slate-400">
                    <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Select a route to view details</p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Route Header */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-white">Route #{routeDetails.id}</CardTitle>
                        <p className="text-sm text-slate-400 mt-1">
                          {routeDetails.worker?.name || "Unassigned"}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded flex items-center gap-2 ${getStatusColor(routeDetails.status)}`}>
                        {getStatusIcon(routeDetails.status)}
                        {routeDetails.status}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-lg font-bold text-blue-400">
                          {Number(routeDetails.totalDistance || 0).toFixed(2)}km
                        </div>
                        <div className="text-xs text-slate-400">Distance</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-lg font-bold text-green-400">
                          {(() => {
                            const duration = Number(routeDetails.estimatedDuration || 0);
                            const hours = Math.floor(duration);
                            const minutes = Math.round((duration - hours) * 60);
                            return `${hours}h ${minutes}min`;
                          })()}
                        </div>
                        <div className="text-xs text-slate-400">Duration</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-lg font-bold text-orange-400">
                          {routeDetails.customers?.length || 0}
                        </div>
                        <div className="text-xs text-slate-400">Stops</div>
                      </div>
                      <div className="text-center p-3 bg-slate-700/30 rounded-lg">
                        <div className="text-lg font-bold text-purple-400">
                          {routeDetails.efficiencyScore || 0}%
                        </div>
                        <div className="text-xs text-slate-400">Efficiency</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Route Stops */}
                <Card className="bg-slate-800/50 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-white">Route Stops</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {routeDetails.customers && routeDetails.customers.length > 0 ? (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto">
                        {routeDetails.customers.map((customer, index) => (
                          <div key={customer.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                            <span className="w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                              {index + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm text-white truncate">{customer.name}</h4>
                              <p className="text-xs text-slate-400 truncate">{customer.address}</p>
                            </div>
                            {customer.completedAt && (
                              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-slate-400">
                        No stops assigned to this route
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

