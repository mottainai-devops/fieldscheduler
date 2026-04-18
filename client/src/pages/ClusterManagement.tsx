import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, MapPin, Truck, CheckCircle, Map as MapIcon, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import AppHeader from "@/components/AppHeader";
import { useLocation } from "wouter";
import ClusterMap from "@/components/ClusterMap";
import { CardSkeleton, CenteredLoader, Spinner } from "@/components/LoadingComponents";
import { ErrorState } from "@/components/ErrorComponents";

const asArray = <T,>(v: T[] | T | undefined | null | false): T[] => Array.isArray(v) ? v : (v != null && v !== false ? [v as T] : []);

export default function ClusterManagement() {
  const [, setLocation] = useLocation();
  const [clusterMode, setClusterMode] = useState<'distance' | 'count'>('count');
  const [clusterDistance, setClusterDistance] = useState(5);
  const [customersPerCluster, setCustomersPerCluster] = useState(10);
  const [assignedClusters, setAssignedClusters] = useState<Record<number, number>>({});
  const [primaryFilterType, setPrimaryFilterType] = useState<'building' | 'manager'>('building');
  const [filterBuilding, setFilterBuilding] = useState<string>('none');
  const [filterManager, setFilterManager] = useState<string>('none');
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState<string>('all');
  const [searchCustomer, setSearchCustomer] = useState<string>('');

  const { data: clustersByDistance = [], isLoading: loadingDistanceClusters } = trpc.fieldWorker.getCustomerClusters.useQuery(
    { maxDistance: clusterDistance },
    { enabled: clusterMode === 'distance' }
  );
  const { data: clustersByCount = [], isLoading: loadingCountClusters } = trpc.fieldWorker.getCustomerClustersByCount.useQuery(
    { customersPerCluster },
    { enabled: clusterMode === 'count' }
  );
  const clusters = clusterMode === 'distance' ? clustersByDistance : clustersByCount;
  const isLoadingClusters = clusterMode === 'distance' ? loadingDistanceClusters : loadingCountClusters;
  const { data: workers = [], isLoading: loadingWorkers } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: routes = [], isLoading: loadingRoutes } = trpc.fieldWorker.getRoutes.useQuery();
  const createRouteMutation = trpc.fieldWorker.createRoute.useMutation();

  // Calculate worker load (routes assigned)
  const getWorkerLoad = (workerId: number) => {
    return routes.filter(r => r.workerId === workerId).length;
  };

  const getWorkerCustomerCount = (workerId: number) => {
    const workerRoutes = routes.filter(r => r.workerId === workerId);
    // Sum up customer counts across all routes
    return workerRoutes.reduce((total, route) => total + (route.customerCount || 0), 0);
  };

  const handleAssignCluster = async (clusterId: number) => {
    const workerId = assignedClusters[clusterId];
    if (!workerId) {
      toast.error("Please select a worker first");
      return;
    }

    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) return;

    const customerIds = cluster.customers.map(c => c.id);

    try {
      await createRouteMutation.mutateAsync({
        workerId,
        customerIds,
        scheduledDate: new Date().toISOString(),
      });

      toast.success(`Assigned ${customerIds.length} customers to worker`);
      
      // Clear assignment
      setAssignedClusters(prev => {
        const newAssignments = { ...prev };
        delete newAssignments[clusterId];
        return newAssignments;
      });
    } catch (error: any) {
      toast.error(error.message || "Failed to assign cluster");
    }
  };

  const handleWorkerSelect = (clusterId: number, workerId: number) => {
    setAssignedClusters(prev => ({
      ...prev,
      [clusterId]: workerId,
    }));
  };
  // Get all unique building IDs from clusters
  const allClusters = asArray(clusters);
  const buildingIds = Array.from(new Set(
    allClusters.flatMap(c => c.customers.map(cust => cust.customermaf)).filter(Boolean)
  )).sort();

  // Get all unique field managers from clusters
  const fieldManagers = Array.from(new Set(
    allClusters.flatMap(c => c.customers.map(cust => cust.fieldManager)).filter(Boolean)
  )).sort();

  // Filter clusters based on selected filters
  let filteredClusters = allClusters.map(cluster => {
    let filteredCustomers = cluster.customers;

    // Apply primary filter (either building OR manager, not both)
    if (primaryFilterType === 'building' && filterBuilding !== 'none') {
      filteredCustomers = filteredCustomers.filter(c => c.customermaf === filterBuilding);
    } else if (primaryFilterType === 'manager' && filterManager !== 'none') {
      filteredCustomers = filteredCustomers.filter(c => c.fieldManager === filterManager);
    }

    // Apply assignment status sub-filter
    if (filterAssignmentStatus !== 'all') {
      filteredCustomers = filteredCustomers.filter(c => c.routeAssignmentStatus === filterAssignmentStatus);
    }

    if (searchCustomer) {
      filteredCustomers = filteredCustomers.filter(c =>
        c.name.toLowerCase().includes(searchCustomer.toLowerCase())
      );
    }

    return {
      ...cluster,
      customers: filteredCustomers,
    };
  }).filter(c => c.customers.length > 0);

  const hasActiveFilters = (filterBuilding && filterBuilding !== 'none') || (filterManager && filterManager !== 'none') || (filterAssignmentStatus && filterAssignmentStatus !== 'all') || searchCustomer !== '';

  const clearFilters = () => {
    setFilterBuilding('none');
    setFilterManager('none');
    setFilterAssignmentStatus('all');
    setSearchCustomer('');
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Cluster Management</h1>
          <p className="text-slate-400">Group customers by proximity and assign to workers</p>
        </div>

        {/* Clustering Controls */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Clustering Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cluster Mode Toggle */}
            <div className="flex items-center gap-4">
              <label className="text-sm text-slate-300 font-medium">Cluster By:</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={clusterMode === 'distance' ? 'default' : 'outline'}
                  onClick={() => setClusterMode('distance')}
                >
                  Distance Radius
                </Button>
                <Button
                  size="sm"
                  variant={clusterMode === 'count' ? 'default' : 'outline'}
                  onClick={() => setClusterMode('count')}
                >
                  Customer Count
                </Button>
              </div>
            </div>

            {/* Cluster Parameters */}
            {clusterMode === 'distance' ? (
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300 font-medium">Cluster Radius:</label>
                <select
                  value={clusterDistance}
                  onChange={(e) => setClusterDistance(Number(e.target.value))}
                  className="bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm"
                >
                  <option value={3}>3 km</option>
                  <option value={5}>5 km</option>
                  <option value={10}>10 km</option>
                  <option value={15}>15 km</option>
                  <option value={20}>20 km</option>
                </select>
                <span className="text-sm text-slate-400">{clusters.length} clusters found</span>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <label className="text-sm text-slate-300 font-medium">Customers per Cluster:</label>
                <input
                  type="number"
                  min="3"
                  max="50"
                  value={customersPerCluster}
                  onChange={(e) => setCustomersPerCluster(Number(e.target.value))}
                  className="bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm w-24"
                />
                <span className="text-sm text-slate-400">{clusters.length} clusters found</span>
              </div>
            )}

            {/* Customer Filters */}
            <div className="border-t border-slate-700 pt-4 mt-4">
              {/* Search Box */}
              <div className="mb-4">
                <label className="text-sm text-slate-300 font-medium block mb-2">Search by Customer Name</label>
                <input
                  type="text"
                  placeholder="Search customer..."
                  value={searchCustomer}
                  onChange={(e) => setSearchCustomer(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                />
              </div>

              {/* Primary Filter Type Selection */}
              <div className="mb-4">
                <label className="text-sm text-slate-300 font-medium block mb-2">Filter By</label>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={primaryFilterType === 'building' ? 'default' : 'outline'}
                    onClick={() => {
                      setPrimaryFilterType('building');
                      setFilterManager('none');
                    }}
                    className="flex-1"
                  >
                    Building ID
                  </Button>
                  <Button
                    size="sm"
                    variant={primaryFilterType === 'manager' ? 'default' : 'outline'}
                    onClick={() => {
                      setPrimaryFilterType('manager');
                      setFilterBuilding('none');
                    }}
                    className="flex-1"
                  >
                    Field Manager
                  </Button>
                </div>
              </div>

              {/* Primary Filter Dropdown */}
              <div className="mb-4">
                <label className="text-sm text-slate-300 font-medium block mb-2">
                  {primaryFilterType === 'building' ? 'Select Building' : 'Select Manager'}
                </label>
                {primaryFilterType === 'building' ? (
                  <select
                    value={filterBuilding}
                    onChange={(e) => setFilterBuilding(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="none">All Buildings ({buildingIds.length})</option>
                    {buildingIds.map(id => (
                      <option key={id} value={id}>{id}</option>
                    ))}
                  </select>
                ) : (
                  <select
                    value={filterManager}
                    onChange={(e) => setFilterManager(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="none">All Managers ({fieldManagers.length})</option>
                    {fieldManagers.map(manager => (
                      <option key={manager} value={manager}>Worker {manager}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Assignment Status Sub-Filter */}
              <div className="mb-4">
                <label className="text-sm text-slate-300 font-medium block mb-2">Assignment Status</label>
                <select
                  value={filterAssignmentStatus}
                  onChange={(e) => setFilterAssignmentStatus(e.target.value)}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                >
                  <option value="all">All</option>
                  <option value="assigned">Assigned</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Showing {filteredClusters.length} of {allClusters.length} clusters
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Map View */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <MapIcon className="w-5 h-5" />
              Cluster Map View
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ClusterMap 
              clusters={clusters} 
              workers={workers}
              assignedClusters={assignedClusters}
            />
          </CardContent>
        </Card>

        {/* Worker Load Summary */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Worker Load Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {workers.map(worker => {
                const routeCount = getWorkerLoad(worker.id);
                const customerCount = getWorkerCustomerCount(worker.id);
                const loadLevel = routeCount === 0 ? 'none' : routeCount <= 2 ? 'low' : routeCount <= 5 ? 'medium' : 'high';
                const loadColor = loadLevel === 'none' ? 'bg-slate-700' : 
                                 loadLevel === 'low' ? 'bg-green-600/20 border-green-600' : 
                                 loadLevel === 'medium' ? 'bg-yellow-600/20 border-yellow-600' : 
                                 'bg-red-600/20 border-red-600';
                const textColor = loadLevel === 'none' ? 'text-slate-400' : 
                                 loadLevel === 'low' ? 'text-green-400' : 
                                 loadLevel === 'medium' ? 'text-yellow-400' : 
                                 'text-red-400';

                return (
                  <div key={worker.id} className={`rounded-lg p-3 border ${loadColor}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{worker.name}</h4>
                        <p className="text-xs text-slate-400">{worker.phone}</p>
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded ${textColor}`}>
                        {loadLevel.toUpperCase()}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-slate-400">Routes</div>
                        <div className={`font-bold ${textColor}`}>{routeCount}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Customers</div>
                        <div className={`font-bold ${textColor}`}>{customerCount}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Clusters List */}
        {(loadingDistanceClusters && clusterMode === 'distance') || (loadingCountClusters && clusterMode === 'count') ? (
          <CenteredLoader message="Generating clusters..." />
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClusters.length === 0 ? (
            <Card className="bg-slate-800 border-slate-700 col-span-full">
              <CardContent className="p-12 text-center">
                <Target className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <p className="text-slate-400">{hasActiveFilters ? 'No clusters match your filters. Try adjusting them.' : 'No clusters found. Adjust clustering parameters.'}</p>
              </CardContent>
            </Card>
          ) : (
            filteredClusters.map((cluster) => {
              const selectedWorker = assignedClusters[cluster.id];
              const worker = workers.find(w => w.id === selectedWorker);

              return (
                <Card key={cluster.id} className="bg-slate-800 border-slate-700">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                          <Target className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <CardTitle className="text-white text-lg">Cluster {cluster.id}</CardTitle>
                          <p className="text-xs text-slate-400 mt-1">
                            {cluster.radius.toFixed(1)} km radius
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-400">{cluster.customers.length}</div>
                        <div className="text-xs text-slate-400">customers</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Cluster Stats */}
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="bg-slate-900 rounded p-2">
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapPin className="w-4 h-4" />
                          <span>Centroid</span>
                        </div>
                        <div className="text-white text-xs mt-1">
                          {cluster.centroid.lat.toFixed(4)}, {cluster.centroid.lng.toFixed(4)}
                        </div>
                      </div>
                      <div className="bg-slate-900 rounded p-2">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Users className="w-4 h-4" />
                          <span>Stops</span>
                        </div>
                        <div className="text-white text-xs mt-1">
                          {cluster.customers.length} locations
                        </div>
                      </div>
                    </div>

                    {/* Customer List Preview */}
                    <div className="bg-slate-900 rounded p-3">
                      <div className="text-xs text-slate-400 mb-2">Customers:</div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {cluster.customers.slice(0, 5).map(customer => (
                          <div key={customer.id} className="text-xs text-slate-300 flex items-center gap-2">
                            <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                            {customer.name}
                          </div>
                        ))}
                        {cluster.customers.length > 5 && (
                          <div className="text-xs text-slate-500 italic">
                            +{cluster.customers.length - 5} more...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Worker Assignment */}
                    <div className="space-y-2">
                      <label className="text-sm text-slate-300 font-medium">Assign to Worker:</label>
                      <div className="flex gap-2">
                        <select
                          value={selectedWorker || ''}
                          onChange={(e) => handleWorkerSelect(cluster.id, Number(e.target.value))}
                          className="flex-1 bg-slate-700 border-slate-600 text-white rounded px-3 py-2 text-sm"
                        >
                          <option value="">Select worker...</option>
                          {workers.map(w => {
                            const routeCount = getWorkerLoad(w.id);
                            const customerCount = getWorkerCustomerCount(w.id);
                            return (
                              <option key={w.id} value={w.id}>
                                {w.name} - {routeCount} routes, {customerCount} customers
                              </option>
                            );
                          })}
                        </select>
                        <Button
                          onClick={() => handleAssignCluster(cluster.id)}
                          disabled={!selectedWorker || createRouteMutation.isPending}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {createRouteMutation.isPending ? (
                            <>Assigning...</>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Assign
                            </>
                          )}
                        </Button>
                      </div>
                      {worker && (
                        <div className="text-xs text-green-400 flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          Ready to assign to {worker.name}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        )}
      </div>
    </div>
  );
}

