import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, BarChart3, Calendar, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";

export default function Analytics() {
  const { data: routes = [] } = trpc.fieldWorker.getRoutes.useQuery();
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();

  const completedRoutes = routes.filter(r => r.status === "completed");
  const avgEfficiency = routes.length > 0
    ? Math.round(routes.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / routes.length)
    : 0;
  
  const totalDistance = routes.reduce((sum, r) => sum + parseFloat(r.totalDistance || "0"), 0).toFixed(1);
  const totalDuration = routes.reduce((sum, r) => sum + parseFloat(r.estimatedDuration || "0"), 0).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Analytics" subtitle="Performance metrics and insights" />

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Total Routes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{routes.length}</div>
              <div className="flex items-center text-xs text-green-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>{completedRoutes.length} completed</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Avg Efficiency</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{avgEfficiency}%</div>
              <div className="flex items-center text-xs text-green-400">
                <TrendingUp className="w-3 h-3 mr-1" />
                <span>+5% from last month</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Total Distance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">{totalDistance}km</div>
              <div className="flex items-center text-xs text-yellow-400">
                <TrendingDown className="w-3 h-3 mr-1" />
                <span>-12% optimized</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-300">Active Workers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white mb-1">
                {workers.filter(w => w.status === "active").length}
              </div>
              <div className="text-xs text-slate-400">of {workers.length} total</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Route Performance */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Route Performance</CardTitle>
              <CardDescription className="text-slate-400">
                Efficiency scores over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-slate-700/30 rounded-lg border border-slate-600">
                <div className="text-center text-slate-400">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Performance chart would display here</p>
                  <p className="text-xs mt-1">Showing efficiency trends</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Worker Productivity */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Worker Productivity</CardTitle>
              <CardDescription className="text-slate-400">
                Routes completed per worker
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workers.slice(0, 5).map((worker) => {
                  const workerRoutes = routes.filter(r => r.workerId === worker.id);
                  const completed = workerRoutes.filter(r => r.status === "completed").length;
                  const percentage = workerRoutes.length > 0 
                    ? Math.round((completed / workerRoutes.length) * 100) 
                    : 0;
                  
                  return (
                    <div key={worker.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-white">{worker.name}</span>
                        <span className="text-slate-400">{completed}/{workerRoutes.length} routes</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Distribution */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Customer Distribution</CardTitle>
            <CardDescription className="text-slate-400">
              Customers by priority and service type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Priority Distribution */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">By Priority</h4>
                <div className="space-y-2">
                  {["high", "medium", "low"].map((priority) => {
                    const count = customers.filter(c => c.priority === priority).length;
                    const percentage = customers.length > 0 
                      ? Math.round((count / customers.length) * 100) 
                      : 0;
                    
                    return (
                      <div key={priority} className="flex items-center justify-between text-sm">
                        <span className={`capitalize ${
                          priority === "high" ? "text-red-400" :
                          priority === "medium" ? "text-yellow-400" :
                          "text-green-400"
                        }`}>
                          {priority}
                        </span>
                        <span className="text-slate-400">{count} ({percentage}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Service Type Distribution */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">By Service Type</h4>
                <div className="space-y-2">
                  {["maintenance", "inspection", "repair", "compliance"].map((type) => {
                    const count = customers.filter(c => c.serviceType === type).length;
                    
                    return count > 0 ? (
                      <div key={type} className="flex items-center justify-between text-sm">
                        <span className="text-slate-300 capitalize">{type}</span>
                        <span className="text-slate-400">{count}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              {/* Geographic Coverage */}
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-3">Coverage Stats</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Total Customers</span>
                    <span className="text-slate-400">{customers.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">With Coordinates</span>
                    <span className="text-slate-400">
                      {customers.filter(c => c.latitude && c.longitude).length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">With Building ID</span>
                    <span className="text-slate-400">
                      {customers.filter(c => c.buildingId).length}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Activity</CardTitle>
            <CardDescription className="text-slate-400">
              Latest route assignments and completions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {routes.slice(0, 10).map((route) => (
                <div key={route.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Route #{route.id}</div>
                      <div className="text-xs text-slate-400">
                        {route.worker?.name || "Unassigned"} • {route.totalDistance || "0"}km
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    route.status === "completed" ? "bg-green-600/20 text-green-400" :
                    route.status === "in_progress" ? "bg-blue-600/20 text-blue-400" :
                    "bg-yellow-600/20 text-yellow-400"
                  }`}>
                    {route.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

