import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Truck, TrendingUp, Navigation } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { CardSkeleton, ListSkeleton, Spinner } from "@/components/LoadingComponents";
import { ErrorState } from "@/components/ErrorComponents";

export default function Dashboard() {
  const { data: customers = [], isLoading: loadingCustomers, error: customersError, refetch: refetchCustomers } = trpc.fieldWorker.getCustomers.useQuery(undefined, { refetchOnMount: 'stale', staleTime: 0 });
  const { data: routes = [], isLoading: loadingRoutes, error: routesError, refetch: refetchRoutes } = trpc.fieldWorker.getRoutes.useQuery(undefined, { refetchOnMount: 'stale', staleTime: 0 });
  const { data: workers = [], isLoading: loadingWorkers, error: workersError, refetch: refetchWorkers } = trpc.fieldWorker.getWorkers.useQuery(undefined, { refetchOnMount: 'stale', staleTime: 0 });
  //   const { data: vehicles = [], isLoading: loadingVehicles, error: vehiclesError, refetch: refetchVehicles } = trpc.fieldWorker.getVehicles.useQuery(undefined, { refetchOnMount: 'stale', staleTime: 0 });

  const hasError = customersError || routesError || workersError;
  const isLoading = loadingCustomers || loadingRoutes || loadingWorkers;

  const handleRetry = () => {
    refetchCustomers();
    refetchRoutes();
    refetchWorkers();
    //     refetchVehicles();
  };

  const activeRoutes = routes.filter(r => r.status === "in_progress");
  const avgEfficiency = routes.length > 0
    ? Math.round(routes.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / routes.length)
    : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Dashboard" subtitle="Field Worker Scheduler" />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats Cards */}
        {hasError ? (
          <ErrorState error={hasError} onRetry={handleRetry} />
        ) : isLoading ? (
          <CardSkeleton count={5} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Customers</CardTitle>
              <Users className="w-4 h-4 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loadingCustomers ? "..." : customers.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {customers.filter(c => c.latitude && c.longitude).length} with GPS
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Routes</CardTitle>
              <Navigation className="w-4 h-4 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loadingRoutes ? "..." : activeRoutes.length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {routes.length} total routes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Field Workers</CardTitle>
              <Users className="w-4 h-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loadingWorkers ? "..." : workers.filter(w => w.status === "active").length}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {workers.length} total workers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Avg Efficiency</CardTitle>
              <TrendingUp className="w-4 h-4 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {loadingRoutes ? "..." : `${avgEfficiency}%`}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Route optimization score
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Routes</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingRoutes ? (
                <p className="text-slate-400">Loading routes...</p>
              ) : routes.length === 0 ? (
                <p className="text-slate-400">No routes created yet</p>
              ) : (
                <div className="space-y-3">
                  {routes.slice(0, 5).map((route) => (
                    <div key={route.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div>
                        <p className="text-white font-medium">Route #{route.id}</p>
                        <p className="text-sm text-slate-400">
                          {route.totalDistance}km • {route.estimatedDuration}h
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        route.status === "completed" ? "bg-green-500/20 text-green-400" :
                        route.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                        "bg-slate-500/20 text-slate-400"
                      }`}>
                        {route.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingWorkers ? (
                <p className="text-slate-400">Loading workers...</p>
              ) : workers.filter(w => w.status === "active").length === 0 ? (
                <p className="text-slate-400">No active workers</p>
              ) : (
                <div className="space-y-3">
                  {workers.filter(w => w.status === "active").slice(0, 5).map((worker) => (
                    <div key={worker.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                          <p className="text-white font-medium">{worker.name}</p>
                          <p className="text-sm text-slate-400">{worker.phone}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs bg-green-500/20 text-green-400">
                        Active
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

