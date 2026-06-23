import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Clock, CheckCircle, AlertCircle, Zap, Target, Filter, X, Calendar, Pencil, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import AppHeader from "@/components/AppHeader";
import { ListSkeleton } from "@/components/LoadingComponents";
import { ErrorState } from "@/components/ErrorComponents";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "inactive", label: "Inactive (7d+)" },
];

export default function Routes() {
  const { data: routes = [], isLoading, error, refetch } = trpc.fieldWorker.getRoutes.useQuery();
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const { data: routeDetails, refetch: refetchDetails } = trpc.fieldWorker.getRouteDetails.useQuery(
    { id: selectedRoute! },
    { enabled: selectedRoute !== null }
  );
  const utils = trpc.useUtils();

  // 5A(c): Editable date state
  const [editingDate, setEditingDate] = useState(false);
  const [editDateValue, setEditDateValue] = useState("");
  const { isAdmin, isFieldManager } = useAuth();
  const canEditDate = isAdmin || isFieldManager;

  const updateRouteAndNotifyMutation = trpc.fieldWorker.updateRouteAndNotifyWorker.useMutation({
    onSuccess: () => {
      toast.success("Route date updated and worker notified.");
      setEditingDate(false);
      refetchDetails();
      utils.fieldWorker.getRoutes.invalidate();
    },
    onError: (err: any) => {
      toast.error(`Failed to update date: ${err.message}`);
    },
  });

  const handleSaveDate = () => {
    if (!selectedRoute || !editDateValue) return;
    updateRouteAndNotifyMutation.mutate({ id: selectedRoute, scheduledDate: editDateValue });
  };

  // Filter state
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [filterManager, setFilterManager] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d;
  }, []);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      // Status filter
      if (filterStatus !== "all") {
        if (filterStatus === "inactive") {
          // Inactive = not completed AND last update > 7 days ago
          const isNotCompleted = route.status !== "completed" && route.status !== "cancelled";
          const lastActivity = route.updatedAt
            ? new Date(route.updatedAt)
            : route.scheduledDate
            ? new Date(route.scheduledDate)
            : null;
          const isStale = lastActivity ? lastActivity < sevenDaysAgo : false;
          if (!(isNotCompleted && isStale)) return false;
        } else {
          if (route.status !== filterStatus) return false;
        }
      }

      // Date filter (match scheduledDate)
      if (filterDate) {
        const routeDate = route.scheduledDate
          ? new Date(route.scheduledDate).toISOString().slice(0, 10)
          : null;
        if (routeDate !== filterDate) return false;
      }

      // Field manager filter (worker name)
      if (filterManager.trim()) {
        const name = ((route as any).workerName || "").toLowerCase();
        if (!name.includes(filterManager.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [routes, filterStatus, filterDate, filterManager, sevenDaysAgo]);

  const hasActiveFilters = filterStatus !== "all" || filterDate !== "" || filterManager !== "";

  const clearFilters = () => {
    setFilterStatus("all");
    setFilterDate("");
    setFilterManager("");
  };

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
              <CardHeader className="pb-2">
                {/* Title row with filter toggle */}
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">
                    All Routes ({filteredRoutes.length}
                    {hasActiveFilters && routes.length !== filteredRoutes.length
                      ? ` of ${routes.length}`
                      : ""})
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                        title="Clear all filters"
                      >
                        <X className="w-3 h-3" /> Clear
                      </button>
                    )}
                    <button
                      onClick={() => setShowFilters((v) => !v)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors ${
                        showFilters || hasActiveFilters
                          ? "border-blue-500 text-blue-400 bg-blue-600/10"
                          : "border-slate-600 text-slate-400 hover:text-white"
                      }`}
                    >
                      <Filter className="w-3 h-3" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-1 bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                          {[filterStatus !== "all", filterDate !== "", filterManager !== ""].filter(Boolean).length}
                        </span>
                      )}
                    </button>
                  </div>
                </div>

                {/* Expandable filter panel */}
                {showFilters && (
                  <div className="mt-3 space-y-3 border-t border-slate-700 pt-3">
                    {/* Status chips */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Status</p>
                      <div className="flex flex-wrap gap-1.5">
                        {STATUS_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setFilterStatus(opt.value)}
                            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                              filterStatus === opt.value
                                ? "border-blue-500 bg-blue-600/20 text-blue-300"
                                : "border-slate-600 text-slate-400 hover:border-slate-400"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Date picker */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Date</p>
                      <div className="relative">
                        <Calendar className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          value={filterDate}
                          onChange={(e) => setFilterDate(e.target.value)}
                          className="w-full pl-7 pr-2 py-1.5 text-xs bg-slate-700/50 border border-slate-600 rounded text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                        {filterDate && (
                          <button
                            onClick={() => setFilterDate("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Field manager search */}
                    <div>
                      <p className="text-xs text-slate-500 mb-1.5">Field Manager</p>
                      <div className="relative">
                        <Input
                          placeholder="Search by name…"
                          value={filterManager}
                          onChange={(e) => setFilterManager(e.target.value)}
                          className="h-7 text-xs bg-slate-700/50 border-slate-600 text-slate-200 placeholder:text-slate-500 focus:border-blue-500"
                        />
                        {filterManager && (
                          <button
                            onClick={() => setFilterManager("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {error ? (
                  <ErrorState error={error} onRetry={refetch} compact />
                ) : isLoading ? (
                  <ListSkeleton items={6} />
                ) : filteredRoutes.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    {hasActiveFilters ? "No routes match the current filters" : "No routes yet"}
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {filteredRoutes.map((route) => (
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
                            <span>{(route as any).workerName || "Unassigned"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Navigation className="w-3 h-3" />
                            <span>{route.customerCount || 0} stops</span>
                          </div>
                          {/* 5A(e): Show scheduled date on route card */}
                          {route.scheduledDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3 h-3" />
                              <span>{new Date(route.scheduledDate).toLocaleDateString()}</span>
                            </div>
                          )}
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
                        {/* 5A(c): Scheduled date display + editable field */}
                        <div className="flex items-center gap-2 mt-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {editingDate ? (
                            <>
                              <input
                                type="date"
                                value={editDateValue}
                                onChange={(e) => setEditDateValue(e.target.value)}
                                className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <Button
                                size="sm"
                                className="h-6 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                                onClick={handleSaveDate}
                                disabled={updateRouteAndNotifyMutation.isPending}
                              >
                                <Save className="w-3 h-3 mr-1" />
                                {updateRouteAndNotifyMutation.isPending ? "Saving…" : "Save"}
                              </Button>
                              <button
                                className="text-slate-400 hover:text-white text-xs"
                                onClick={() => setEditingDate(false)}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-slate-400">
                                {(routeDetails as any).scheduledDate
                                  ? new Date((routeDetails as any).scheduledDate).toLocaleDateString()
                                  : "No date set"}
                              </span>
                              {canEditDate && (
                                <button
                                  className="text-slate-500 hover:text-blue-400 transition-colors"
                                  title="Edit scheduled date"
                                  onClick={() => {
                                    const current = (routeDetails as any).scheduledDate;
                                    setEditDateValue(current ? new Date(current).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                                    setEditingDate(true);
                                  }}
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
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
