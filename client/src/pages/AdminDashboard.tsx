import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Users,
  Route as RouteIcon,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  MapPin,
  Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import AppHeader from "@/components/AppHeader";
import { useLocation } from "wouter";
import { CardSkeleton, TableSkeleton, Spinner } from "@/components/LoadingComponents";
import { ErrorState, ErrorAlert } from "@/components/ErrorComponents";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const [searchWorker, setSearchWorker] = useState("");
  const [searchRoute, setSearchRoute] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

   const { data: workers = [], isLoading: loadingWorkers, error: workersError, refetch: refetchWorkers } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: routes = [], isLoading: loadingRoutes, error: routesError, refetch: refetchRoutes } = trpc.fieldWorker.getRoutes.useQuery();

  const hasError = workersError || routesError;
  const handleRetryAll = () => {
    refetchWorkers();
    refetchRoutes();
  };
  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();

  const deleteWorkerMutation = trpc.fieldWorker.deleteWorker.useMutation({
    onSuccess: () => {
      refetchWorkers();
    },
  });

  const deleteRouteMutation = trpc.fieldWorker.deleteRoute.useMutation({
    onSuccess: () => {
      refetchRoutes();
    },
  });

  // Filter workers
  const filteredWorkers = workers.filter((worker) => {
    const matchesSearch = worker.name?.toLowerCase().includes(searchWorker.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchWorker.toLowerCase());
    const matchesStatus = filterStatus === "all" || worker.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Filter routes
  const filteredRoutes = routes.filter((route) => {
    const matchesSearch = route.name?.toLowerCase().includes(searchRoute.toLowerCase());
    return matchesSearch;
  });

  // Calculate statistics
  const activeWorkers = workers.filter(w => w.status === "active").length;
  const activeRoutes = routes.filter(r => r.status === "in_progress").length;
  const completedRoutes = routes.filter(r => r.status === "completed").length;
  const avgEfficiency = routes.length > 0
    ? Math.round(routes.reduce((sum, r) => sum + (r.efficiencyScore || 0), 0) / routes.length)
    : 0;

  const handleDeleteWorker = (id: number) => {
    if (confirm("Are you sure you want to delete this worker?")) {
      deleteWorkerMutation.mutate({ id });
    }
  };

  const handleDeleteRoute = (id: number) => {
    if (confirm("Are you sure you want to delete this route?")) {
      deleteRouteMutation.mutate({ id });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "in_progress":
        return "text-green-400 bg-green-400/10";
      case "completed":
        return "text-blue-400 bg-blue-400/10";
      case "inactive":
      case "cancelled":
        return "text-slate-400 bg-slate-400/10";
      case "on_leave":
        return "text-yellow-400 bg-yellow-400/10";
      default:
        return "text-slate-400 bg-slate-400/10";
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Admin Dashboard" subtitle="Worker & Route Management" />

      <main className="container mx-auto px-6 py-8">
        {/* Statistics Cards */}
        {hasError ? (
          <ErrorState error={hasError} onRetry={handleRetryAll} />
        ) : (loadingWorkers || loadingRoutes) ? (
          <CardSkeleton count={4} />
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-blue-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-blue-300">Active Workers</CardTitle>
              <Users className="w-5 h-5 text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{activeWorkers}</div>
              <p className="text-xs text-blue-300 mt-1">
                {workers.length} total workers
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-600/20 to-green-800/20 border-green-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-green-300">Active Routes</CardTitle>
              <RouteIcon className="w-5 h-5 text-green-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{activeRoutes}</div>
              <p className="text-xs text-green-300 mt-1">
                {routes.length} total routes
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-purple-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-purple-300">Completed</CardTitle>
              <CheckCircle className="w-5 h-5 text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{completedRoutes}</div>
              <p className="text-xs text-purple-300 mt-1">
                Routes finished
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-600/20 to-orange-800/20 border-orange-700/50">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-orange-300">Efficiency</CardTitle>
              <TrendingUp className="w-5 h-5 text-orange-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{avgEfficiency}%</div>
              <p className="text-xs text-orange-300 mt-1">
                Average score
              </p>
            </CardContent>
          </Card>
        </div>
        )}

        {/* Worker Management Section */}
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <Users className="w-6 h-6" />
                Worker Management
              </CardTitle>
              <Button
                onClick={() => setLocation("/workers")}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Worker
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filter */}
            <div className="flex gap-4 mb-6">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search workers by name or email..."
                    value={searchWorker}
                    onChange={(e) => setSearchWorker(e.target.value)}
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>

            {/* Workers Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Email</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Phone</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Shift</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingWorkers ? (
                    <tr>
                      <td colSpan={6} className="p-4">
                        <TableSkeleton rows={5} columns={6} />
                      </td>
                    </tr>
                  ) : filteredWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No workers found
                      </td>
                    </tr>
                  ) : (
                    filteredWorkers.map((worker) => (
                      <tr key={worker.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                        <td className="py-3 px-4 text-white font-medium">{worker.name}</td>
                        <td className="py-3 px-4 text-slate-300">{worker.email || "—"}</td>
                        <td className="py-3 px-4 text-slate-300">{worker.phone || "—"}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(worker.status)}`}>
                            {worker.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300">
                          {worker.shiftStart && worker.shiftEnd
                            ? `${worker.shiftStart} - ${worker.shiftEnd}`
                            : "—"}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setLocation(`/workers`)}
                              className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteWorker(worker.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                              disabled={deleteWorkerMutation.isPending}
                            >
                              {deleteWorkerMutation.isPending ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Route Management Section */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
                <RouteIcon className="w-6 h-6" />
                Route Management
              </CardTitle>
              <Button
                onClick={() => setLocation("/create-route")}
                className="bg-green-600 hover:bg-green-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Route
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search routes by name..."
                  value={searchRoute}
                  onChange={(e) => setSearchRoute(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>

            {/* Routes Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Route Name</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Worker</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Customers</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Efficiency</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRoutes ? (
                    <tr>
                      <td colSpan={7} className="p-4">
                        <TableSkeleton rows={5} columns={7} />
                      </td>
                    </tr>
                  ) : filteredRoutes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        No routes found
                      </td>
                    </tr>
                  ) : (
                    filteredRoutes.map((route) => {
                      const worker = workers.find(w => w.id === route.workerId);
                      return (
                        <tr key={route.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                          <td className="py-3 px-4 text-white font-medium">{route.name}</td>
                          <td className="py-3 px-4 text-slate-300">{worker?.name || "Unassigned"}</td>
                          <td className="py-3 px-4 text-slate-300">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {route.scheduledDate ? new Date(route.scheduledDate).toLocaleDateString() : "—"}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-slate-300">{route.customerCount || 0}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(route.status)}`}>
                              {route.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300">
                            {route.efficiencyScore ? `${route.efficiencyScore}%` : "—"}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setLocation(`/routes`)}
                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRoute(route.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                disabled={deleteRouteMutation.isPending}
                              >
                                {deleteRouteMutation.isPending ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

