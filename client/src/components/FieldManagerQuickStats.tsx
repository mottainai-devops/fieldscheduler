import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { ChevronDown, ChevronUp, Tags, Users, Route, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function FieldManagerQuickStats() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Queries
  const { data: allTags = {}, isLoading: tagsLoading, refetch: refetchTags } = trpc.fieldWorker.getAllFieldManagerTags.useQuery();
  const { data: allCustomers = [], isLoading: customersLoading, refetch: refetchCustomers } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: routes = [], isLoading: routesLoading, refetch: refetchRoutes } = trpc.fieldWorker.getRoutes.useQuery();
  const { data: workers = [], isLoading: workersLoading } = trpc.fieldWorker.getWorkers.useQuery();

  // Calculate stats
  const totalTags = Object.values(allTags).reduce((sum: number, tags: any) => sum + (Array.isArray(tags) ? tags.length : 0), 0);
  const totalManagers = Object.keys(allTags).length;
  const pendingRoutes = routes.filter((r) => r.status === "pending").length;
  const activeRoutes = routes.filter((r) => r.status === "in_progress").length;
  const filteredCustomersCount = allCustomers.filter((c) => c.maf).length;

  const isLoading = tagsLoading || customersLoading || routesLoading || workersLoading;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchTags(), refetchCustomers(), refetchRoutes()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const stats = [
    {
      icon: Tags,
      label: "Active Tags",
      value: totalTags,
      color: "text-blue-400",
      bgColor: "bg-blue-900/20",
      description: "Building IDs assigned",
    },
    {
      icon: Users,
      label: "Field Managers",
      value: totalManagers,
      color: "text-purple-400",
      bgColor: "bg-purple-900/20",
      description: "Managers with tags",
    },
    {
      icon: Route,
      label: "Active Routes",
      value: activeRoutes,
      color: "text-green-400",
      bgColor: "bg-green-900/20",
      description: "Routes in progress",
    },
    {
      icon: Zap,
      label: "Pending Routes",
      value: pendingRoutes,
      color: "text-yellow-400",
      bgColor: "bg-yellow-900/20",
      description: "Routes awaiting dispatch",
    },
  ];

  return (
    <div className="bg-slate-800/50 border-b border-slate-700">
      <div className="container mx-auto px-6 py-3">
        {/* Collapsed View */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-slate-400 hover:text-slate-200 h-auto p-1"
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </Button>

            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-300">Quick Stats:</span>
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-900/30 text-blue-300 border border-blue-700">
                  {isLoading ? "..." : totalTags} Tags
                </Badge>
                <Badge className="bg-purple-900/30 text-purple-300 border border-purple-700">
                  {isLoading ? "..." : totalManagers} Managers
                </Badge>
                <Badge className="bg-green-900/30 text-green-300 border border-green-700">
                  {isLoading ? "..." : activeRoutes} Active
                </Badge>
                <Badge className="bg-yellow-900/30 text-yellow-300 border border-yellow-700">
                  {isLoading ? "..." : pendingRoutes} Pending
                </Badge>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="text-slate-400 hover:text-slate-200 h-auto p-1"
            title="Refresh statistics"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Expanded View */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className={`p-3 rounded-lg border border-slate-700 ${stat.bgColor} hover:border-slate-600 transition`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <Icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{stat.label}</p>
                    <p className={`text-2xl font-bold ${stat.color}`}>
                      {isLoading ? "..." : stat.value}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">{stat.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Additional Info */}
            <div className="mt-4 pt-4 border-t border-slate-700 grid grid-cols-2 md:grid-cols-3 gap-3">
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Total Customers</p>
                <p className="text-lg font-semibold text-white">
                  {isLoading ? "..." : allCustomers.length}
                </p>
              </div>
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Tagged Customers</p>
                <p className="text-lg font-semibold text-blue-400">
                  {isLoading ? "..." : filteredCustomersCount}
                </p>
              </div>
              <div className="bg-slate-700/30 p-3 rounded-lg">
                <p className="text-xs text-slate-400 mb-1">Completed Routes</p>
                <p className="text-lg font-semibold text-green-400">
                  {isLoading ? "..." : routes.filter((r) => r.status === "completed").length}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

