import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Truck, Zap, Navigation, CheckCircle, Target, X, Save, Trash2, Settings } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/AppHeader";

// ---- safe list guards (injected) ----
const asArray = <T,>(v: T[] | T | undefined | null | false): T[] => Array.isArray(v) ? v : (v != null && v !== false ? [v as T] : []);
const safeMap = <T, R>(v: T[] | undefined | null, fn: (x: T, i: number) => R): R[] =>
  Array.isArray(v) ? v.map(fn) : [];
const toList = <T,>(v: any): T[] => Array.isArray(v) ? v as T[] : (v == null ? [] : [/*coerced*/].filter(()=>false));
const mapList = <T, U>(v: any, fn: (x:T,i:number)=>U) => toList<T>(v).map(fn);
// -------------------------------------

export default function CreateRoute() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [selectedCustomers, setSelectedCustomers] = useState<number[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<number | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState<any>(null);
  const [selectionMode, setSelectionMode] = useState<'manual' | 'cluster'>('manual');
  const [clusterMode, setClusterMode] = useState<'distance' | 'count'>('distance');
  const [clusterDistance, setClusterDistance] = useState(5);
  const [customersPerCluster, setCustomersPerCluster] = useState(10);
  const [selectedFieldManager, setSelectedFieldManager] = useState<string>('');
  const [selectedMAF, setSelectedMAF] = useState<string>("");
  const [selectedCustomerType, setSelectedCustomerType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRouteStatus, setSelectedRouteStatus] = useState<string>("");
  const [showAdvancedClustering, setShowAdvancedClustering] = useState(false);
  const [minClusterSize, setMinClusterSize] = useState(3);
  const [maxClusterRadius, setMaxClusterRadius] = useState(15);
  // A3: Supervisor picker state
  const [selectedSupervisor, setSelectedSupervisor] = useState<number | null>(null);
  const [supervisorLotWarning, setSupervisorLotWarning] = useState<string | null>(null);

  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: clustersByDistanceRaw = [], isLoading: loadingDistance } = trpc.fieldWorker.getCustomerClusters.useQuery(
    { maxDistance: clusterDistance },
    { 
      enabled: selectionMode === 'cluster' && clusterMode === 'distance',
      retry: false,
      refetchOnWindowFocus: false
    }
  );
  const { data: clustersByCountRaw = [], isLoading: loadingCount } = trpc.fieldWorker.getCustomerClustersByCount.useQuery(
    { customersPerCluster },
    { 
      enabled: selectionMode === 'cluster' && clusterMode === 'count',
      retry: false,
      refetchOnWindowFocus: false
    }
  );
  const clustersByDistance = asArray(clustersByDistanceRaw);
  const clustersByCount = asArray(clustersByCountRaw);
  const clusters = clusterMode === 'distance' ? clustersByDistance : clustersByCount;
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  // A3: Fetch supervisors for the picker
  const { data: supervisorsData } = trpc.fieldWorker.getSurveyAppSupervisors.useQuery();
  const supervisors = (supervisorsData as any)?.supervisors ?? [];
  // Filter workers to field_managers only for the worker picker
  const fieldManagers = workers.filter((w: any) => !w.role || w.role === 'field_manager');

  // A4: Lot-access validation — check if selected supervisor has access to the lots
  // of the selected customers. Warn admin if any customer's lot is not in the supervisor's
  // assignedLots list. This is a soft warning, not a hard block.
  const validateSupervisorLotAccess = (supervisorId: number | null, customerIds: number[]) => {
    if (!supervisorId || customerIds.length === 0) {
      setSupervisorLotWarning(null);
      return;
    }
    // B4: supervisorId is now always fieldworkerId (workers.id), look up by that
    const sup = supervisors.find((s: any) => s.fieldworkerId != null && String(s.fieldworkerId) === String(supervisorId));
    // Support both new `lots` field and legacy `assignedLots` field
    const supLots = sup?.lots ?? sup?.assignedLots ?? [];
    if (!supLots.length) {
      setSupervisorLotWarning(null);
      return;
    }
    const supLotCodes = new Set<string>(supLots.map((l: any) => String(l.lotCode)));
    const selectedCustomerData = asArray(customers).filter(c => customerIds.includes(c.id));
    const unmatched = selectedCustomerData.filter(c => {
      const maf = c.customermaf || "";
      const lotMatch = maf.match(/-?(\d+)$/);
      const lotCode = lotMatch ? lotMatch[1] : null;
      return lotCode && !supLotCodes.has(lotCode);
    });
    if (unmatched.length > 0) {
      setSupervisorLotWarning(
        `Warning: ${unmatched.length} customer(s) are in lots not assigned to this supervisor (${unmatched.slice(0, 3).map(c => c.customermaf).join(", ")}${unmatched.length > 3 ? "..." : ""}). The supervisor will still be able to perform pickups, but provenance may be incomplete.`
      );
    } else {
      setSupervisorLotWarning(null);
    }
  };

  const getFieldManagerName = (managerId: number | null) => {
    if (!managerId) return null;
    const manager = workers.find(w => w.id === managerId);
    return manager?.name || null;
  };




  const createRouteMutation = trpc.fieldWorker.createRoute.useMutation();
  const optimizeRouteMutation = trpc.fieldWorker.optimizeRoute.useMutation();

  // Filter customers with hierarchical filtering
  let filteredCustomers = asArray(customers);
  
  // 1. Field Manager filter (primary)
  if (selectedFieldManager) {
    filteredCustomers = filteredCustomers.filter(
      customer => customer.fieldManager?.toString() === selectedFieldManager
    );
  }
  
  // 2. MAF filter (secondary, filtered by selected manager)
  if (selectedMAF) {
    filteredCustomers = filteredCustomers.filter(
      customer => customer.customermaf === selectedMAF
    );
  }
  
  // 3. Customer Type filter (tertiary)
  if (selectedCustomerType) {
    filteredCustomers = filteredCustomers.filter(
      customer => customer.customerType === selectedCustomerType
    );
  }
  
  // 4. Route Assignment Status filter (quaternary)
  if (selectedRouteStatus) {
    filteredCustomers = filteredCustomers.filter(
      customer => customer.routeAssignmentStatus === selectedRouteStatus
    );
  }
  
  // Apply search filter
  if (searchQuery) {
    filteredCustomers = filteredCustomers.filter(
      customer => customer.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }
  
  // Get unique field managers
  const uniqueFieldManagers = Array.from(
    new Set(asArray(customers).map(c => c.fieldManager).filter(Boolean))
  ).sort((a, b) => (a || 0) - (b || 0));
  
  // Get MAFs filtered by selected field manager
  const availableMAFs = selectedFieldManager
    ? Array.from(
        new Set(
          asArray(customers)
            .filter(c => c.fieldManager?.toString() === selectedFieldManager)
            .map(c => c.customermaf)
            .filter(Boolean)
        )
      ).sort()
    : Array.from(new Set(asArray(customers).map(c => c.customermaf).filter(Boolean))).sort();
  
  const hasActiveFilters = selectedFieldManager || selectedMAF || selectedCustomerType || selectedRouteStatus || searchQuery;
  
  const clearFilters = () => {
    setSelectedFieldManager("");
    setSelectedMAF("");
    setSelectedCustomerType("");
    setSelectedRouteStatus("");
    setSearchQuery("");
  };
  


  const toggleCustomer = (customerId: number) => {
    setSelectedCustomers(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const selectAllInCluster = (clusterId: number) => {
    const cluster = clusters.find(c => c.id === clusterId);
    if (!cluster) return;
    
    const clusterCustomerIds = asArray(cluster.customers).map(c => c.id);
    const allSelected = clusterCustomerIds.every(id => selectedCustomers.includes(id));
    
    if (allSelected) {
      // Deselect all in cluster
      setSelectedCustomers(prev => prev.filter(id => !clusterCustomerIds.includes(id)));
      toast.info(`Deselected ${clusterCustomerIds.length} customers from cluster`);
    } else {
      // Select all in cluster
      setSelectedCustomers(prev => {
        const newSelection = [...prev];
        clusterCustomerIds.forEach(id => {
          if (!newSelection.includes(id)) {
            newSelection.push(id);
          }
        });
        return newSelection;
      });
      toast.success(`Selected ${clusterCustomerIds.length} customers from cluster`);
    }
  };

  const getCustomerCluster = (customerId: number) => {
    return clusters.find(cluster => 
      cluster.customers.some(c => c.id === customerId)
    );
  };

  const handleOptimize = async () => {
    // Defensive validation
    if (!Array.isArray(selectedCustomers) || selectedCustomers.length === 0) {
      toast.error("Pick at least 1 customer");
      return;
    }
    if (!selectedWorker) {
      toast.error("Pick a worker");
      return;
    }

    console.log("[OPTIMIZE] payload", {
      selectedCustomers,
      selectedWorker,
    });

    setOptimizing(true);
    
    try {
      // Call the ArcGIS optimization API
      const result = await optimizeRouteMutation.mutateAsync({
        customerIds: selectedCustomers,
      });

      console.log("[OPTIMIZE] result", result);

      if (!result || !result.stops || result.stops.length === 0) {
        throw new Error("No stops returned from routing service");
      }
      
      // Get customer data for the optimized stops
      const selectedCustomerData = asArray(customers).filter(c => selectedCustomers.includes(c.id));
      
      // Use the actual distance and duration from ArcGIS
      const totalDistance = result.totalDistance || 0; // in kilometers
      const estimatedDuration = result.totalTime || 0; // in minutes
      
      setOptimizedRoute({
        customers: selectedCustomerData,
        optimizedSequence: result.stops,
        totalDistance,
        estimatedDuration,
        efficiencyScore: Math.max(50, Math.min(99, Math.round((result.stops.length / 10) * 10))),
      });
      
      setStep(3);
      toast.success("Route optimized successfully!");
    } catch (error: any) {
      console.error("Route optimization error:", error);
      toast.error(`Optimization failed: ${error?.message || "Unknown error"}`);
    } finally {
      setOptimizing(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!selectedWorker || !optimizedRoute) {
      toast.error("Please complete all steps before creating the route");
      return;
    }
    // A4: Hard block — supervisor must have lot access for all selected customers
    if (supervisorLotWarning) {
      toast.error(
        "Cannot create route: " + supervisorLotWarning + " Please choose a supervisor with access to all selected lots, or remove the out-of-lot customers.",
        { duration: 8000 }
      );
      return;
    }
    
    try {
      const routeData = {
        workerId: selectedWorker,
        supervisorId: selectedSupervisor ?? undefined,
        totalDistance: String(optimizedRoute.totalDistance || 0),
        estimatedDuration: String(optimizedRoute.estimatedDuration || 0),
        efficiencyScore: Number(optimizedRoute.efficiencyScore || 50),
        customerIds: selectedCustomers.filter(id => typeof id === 'number' && !isNaN(id)),
        scheduledDate: new Date().toISOString().split('T')[0],
        status: "assigned" as const,
      };
      
      console.log("[CREATE ROUTE] Sending data:", routeData);
      console.log("[CREATE ROUTE] selectedWorker:", selectedWorker);
      console.log("[CREATE ROUTE] selectedCustomers:", selectedCustomers);
      console.log("[CREATE ROUTE] optimizedRoute:", optimizedRoute);
      
      await createRouteMutation.mutateAsync(routeData);
      
      toast.success("Route created and assigned successfully!");
      setTimeout(() => {
        setLocation("/routes");
      }, 1500);
    } catch (error) {
      console.error("Error creating route:", error);
      toast.error("Failed to create route. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader title="Create Route" subtitle="Select customers, optimize, and assign" />

      {/* Progress Steps */}
      <div className="border-b border-slate-700 bg-slate-800/30">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-center gap-4">
            {[
              { num: 1, label: "Select Customers", icon: MapPin },
              { num: 2, label: "Choose Worker", icon: Users },
              { num: 3, label: "Optimize & Review", icon: Zap },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  step === s.num ? "bg-blue-600/20 text-blue-400" :
                  step > s.num ? "bg-green-600/20 text-green-400" :
                  "bg-slate-700/30 text-slate-500"
                }`}>
                  <s.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{s.label}</span>
                  {step > s.num && <CheckCircle className="w-4 h-4" />}
                </div>
                {idx < 2 && <div className="w-8 h-0.5 bg-slate-600" />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Step 1: Select Customers */}
        {step === 1 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Select Customers ({selectedCustomers.length} selected)</CardTitle>
              <CardDescription className="text-slate-400">
                Choose customers manually or select entire clusters
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {/* Fixed Floating Button - Always visible at top right */}
              {selectedCustomers.length > 0 && (
                <div className="fixed top-24 right-8 z-[100] animate-in fade-in slide-in-from-right-5">
                  <Button
                    onClick={() => setStep(2)}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-2xl border-2 border-blue-400/50"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      <span>Next: Choose Worker</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm font-bold">
                        {selectedCustomers.length}
                      </span>
                    </span>
                  </Button>
                </div>
              )}
              
              <Tabs value={selectionMode} onValueChange={(v) => setSelectionMode(v as 'manual' | 'cluster')} className="mb-6">
                <TabsList className="bg-slate-700">
                  <TabsTrigger value="manual">Manual Selection</TabsTrigger>
                  <TabsTrigger value="cluster">Cluster Selection</TabsTrigger>
                </TabsList>

                {/* Manual Selection */}
                <TabsContent value="manual" className="mt-4">
                  {/* Filters Section */}
                  <div className="mb-6 p-4 bg-slate-700/30 rounded-lg border border-slate-600 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-white">Filter Customers</h3>
                      {hasActiveFilters && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={clearFilters}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          <X className="w-3 h-3 mr-1" />
                          Clear Filters
                        </Button>
                      )}
                    </div>
                    
                    {/* Search Box */}
                    <div>
                      <Label className="text-slate-300 text-xs mb-2 block">Search by Name</Label>
                      <input
                        type="text"
                        placeholder="Search customers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-600 border-slate-500 text-white rounded px-3 py-2 text-sm placeholder-slate-400"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* 1. Field Manager Filter (Primary) */}
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs">Filter by Field Manager</Label>
                        <Select value={selectedFieldManager} onValueChange={(value) => {
                          setSelectedFieldManager(value);
                          setSelectedMAF(""); // Reset MAF when manager changes
                        }}>
                          <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                            <SelectValue placeholder="All Field Managers" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="all" className="text-white">All Field Managers</SelectItem>
                            {uniqueFieldManagers.map(managerId => (
                              <SelectItem key={managerId} value={managerId?.toString() || ""} className="text-white">
                                Worker {managerId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 2. MAF Filter (Secondary) */}
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs">Filter by MAF</Label>
                        <Select value={selectedMAF} onValueChange={setSelectedMAF}>
                          <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                            <SelectValue placeholder="All MAFs" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="all" className="text-white">All MAFs ({availableMAFs.length})</SelectItem>
                            {availableMAFs.map(maf => (
                              <SelectItem key={maf} value={maf || ""} className="text-white">
                                {maf}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 3. Customer Type Filter (Tertiary) */}
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs">Filter by Customer Type</Label>
                        <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                          <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                            <SelectValue placeholder="All Customer Types" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="all" className="text-white">All Customer Types</SelectItem>
                            <SelectItem value="residential" className="text-white">Residential</SelectItem>
                            <SelectItem value="business" className="text-white">Business</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 4. Route Assignment Status Filter (Quaternary) */}
                      <div className="space-y-2">
                        <Label className="text-slate-300 text-xs">Filter by Route Assignment Status</Label>
                        <Select value={selectedRouteStatus} onValueChange={setSelectedRouteStatus}>
                          <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="all" className="text-white">All Statuses</SelectItem>
                            <SelectItem value="assigned" className="text-white">Route Assigned</SelectItem>
                            <SelectItem value="unassigned" className="text-white">Route Unassigned</SelectItem>
                            <SelectItem value="untreated" className="text-white">Untreated</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    
                    {/* Filter Stats */}
                    <div className="text-xs text-slate-400">
                      Showing {filteredCustomers.length} of {asArray(customers).length} customers
                    </div>
                  </div>
                  
                  {filteredCustomers.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400 mb-2">No customers found</p>
                      <p className="text-slate-500 text-sm">
                        {hasActiveFilters ? "Try adjusting your filters" : "No customers available"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {filteredCustomers.map((customer) => (
                        <div
                          key={customer.id}
                          onClick={() => toggleCustomer(customer.id)}
                          className={`p-4 rounded-lg border cursor-pointer transition-all ${
                            selectedCustomers.includes(customer.id)
                              ? "bg-blue-600/20 border-blue-500"
                              : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-white">{customer.name}</h3>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded ${
                                customer.customermaf ? "bg-blue-600/20 text-blue-400" :
                                "bg-gray-600/20 text-gray-400"
                              }`}>
                                {customer.customermaf || "No MAF"}
                              </span>
                              {selectedCustomers.includes(customer.id) && (
                                <CheckCircle className="w-4 h-4 text-blue-400" />
                              )}
                            </div>
                          </div>
                          
                          <p className="text-sm text-slate-400 mb-2">{customer.address}</p>
                          
                          {customer.latitude && customer.longitude && (
                            <p className="text-xs text-slate-500 mb-2">
                              📍 {customer.latitude}, {customer.longitude}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-2 flex-wrap mt-2">
                            {customer.customerType && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                customer.customerType === "residential" ? "bg-green-600/20 text-green-400" :
                                "bg-purple-600/20 text-purple-400"
                              }`}>
                                {customer.customerType === "residential" ? "Residential" : "Business"}
                              </span>
                            )}
                            
                            {customer.routeAssignmentStatus && (
                              <span className={`text-xs px-2 py-1 rounded ${
                                customer.routeAssignmentStatus === "assigned" ? "bg-blue-600/20 text-blue-400" :
                                customer.routeAssignmentStatus === "unassigned" ? "bg-yellow-600/20 text-yellow-400" :
                                "bg-red-600/20 text-red-400"
                              }`}>
                                {customer.routeAssignmentStatus === "assigned" ? "Route Assigned" :
                                 customer.routeAssignmentStatus === "unassigned" ? "Route Unassigned" :
                                 "Untreated"}
                              </span>
                            )}
                            
                            <span className={`text-xs px-2 py-1 rounded ${
                              customer.priority === "high" ? "bg-red-600/20 text-red-400" :
                              customer.priority === "medium" ? "bg-yellow-600/20 text-yellow-400" :
                              "bg-green-600/20 text-green-400"
                            }`}>
                              {customer.priority}
                            </span>
                            
                            <span className="text-xs text-slate-500">{customer.serviceType}</span>
                          </div>
                          
                          {getFieldManagerName(customer.fieldManager) && (
                            <p className="text-sm text-purple-400 mt-2">
                              Manager: {getFieldManagerName(customer.fieldManager)}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Cluster Selection */}
                <TabsContent value="cluster" className="mt-4">
                  <div className="mb-4 space-y-4">
                    {/* Filters Section - Applied Before Clustering */}
                    <div className="border-b border-slate-600 pb-4">
                      <h3 className="text-sm font-semibold text-white mb-3">Step 1: Filter Customers</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* 1. Field Manager Filter (Primary) */}
                        <div className="space-y-2">
                          <Label className="text-slate-300 text-xs">Filter by Field Manager</Label>
                          <Select value={selectedFieldManager} onValueChange={(value) => {
                            setSelectedFieldManager(value);
                            setSelectedMAF(""); // Reset MAF when manager changes
                          }}>
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue placeholder="All Field Managers" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="all" className="text-white">All Field Managers</SelectItem>
                              {uniqueFieldManagers.map(managerId => (
                                <SelectItem key={managerId} value={managerId?.toString() || ""} className="text-white">
                                  Worker {managerId}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 2. MAF Filter (Secondary) */}
                        <div className="space-y-2">
                          <Label className="text-slate-300 text-xs">Filter by MAF</Label>
                          <Select value={selectedMAF} onValueChange={setSelectedMAF}>
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue placeholder="All MAFs" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="all" className="text-white">All MAFs ({availableMAFs.length})</SelectItem>
                              {availableMAFs.map(maf => (
                                <SelectItem key={maf} value={maf || ""} className="text-white">
                                  {maf}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 3. Customer Type Filter (Tertiary) */}
                        <div className="space-y-2">
                          <Label className="text-slate-300 text-xs">Filter by Customer Type</Label>
                          <Select value={selectedCustomerType} onValueChange={setSelectedCustomerType}>
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue placeholder="All Customer Types" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="all" className="text-white">All Customer Types</SelectItem>
                              <SelectItem value="residential" className="text-white">Residential</SelectItem>
                              <SelectItem value="business" className="text-white">Business</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* 4. Route Assignment Status Filter (Quaternary) */}
                        <div className="space-y-2">
                          <Label className="text-slate-300 text-xs">Filter by Route Assignment Status</Label>
                          <Select value={selectedRouteStatus} onValueChange={setSelectedRouteStatus}>
                            <SelectTrigger className="bg-slate-600 border-slate-500 text-white">
                              <SelectValue placeholder="All Statuses" />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-700 border-slate-600">
                              <SelectItem value="all" className="text-white">All Statuses</SelectItem>
                              <SelectItem value="assigned" className="text-white">Route Assigned</SelectItem>
                              <SelectItem value="unassigned" className="text-white">Route Unassigned</SelectItem>
                              <SelectItem value="untreated" className="text-white">Untreated</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="text-xs text-slate-400 mt-3">
                        Filtered: {filteredCustomers.length} of {asArray(customers).length} customers
                      </div>
                    </div>

                    {/* Clustering Section */}
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-3">Step 2: Cluster Filtered Customers</h3>
                    </div>
                    
                    {/* Cluster Mode Toggle */}
                    <div className="flex items-center gap-4">
                      <label className="text-sm text-slate-300">Cluster By:</label>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={clusterMode === 'distance' ? 'default' : 'outline'}
                          onClick={() => setClusterMode('distance')}
                          className="text-xs"
                        >
                          Distance Radius
                        </Button>
                        <Button
                          size="sm"
                          variant={clusterMode === 'count' ? 'default' : 'outline'}
                          onClick={() => setClusterMode('count')}
                          className="text-xs"
                        >
                          Customer Count
                        </Button>
                      </div>
                    </div>

                    {/* Cluster Parameters */}
                    <div className="space-y-3">
                      {clusterMode === 'distance' ? (
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-slate-300">Cluster Radius:</label>
                          <select
                            value={clusterDistance}
                            onChange={(e) => setClusterDistance(Number(e.target.value))}
                            className="bg-slate-700 border-slate-600 text-white rounded px-3 py-1 text-sm"
                          >
                            <option value={3}>3 km</option>
                            <option value={5}>5 km</option>
                            <option value={10}>10 km</option>
                            <option value={15}>15 km</option>
                          </select>
                          <span className="text-xs text-slate-400">{asArray(clusters).length} clusters found</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <label className="text-sm text-slate-300">Customers per Cluster:</label>
                          <input
                            type="number"
                            min="3"
                            max="50"
                            value={customersPerCluster}
                            onChange={(e) => setCustomersPerCluster(Number(e.target.value))}
                            className="bg-slate-700 border-slate-600 text-white rounded px-3 py-1 text-sm w-20"
                          />
                          <span className="text-xs text-slate-400">{asArray(clusters).length} clusters found</span>
                        </div>
                      )}
                      
                      {/* Advanced Clustering Options */}
                      <div className="border-t border-slate-600 pt-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setShowAdvancedClustering(!showAdvancedClustering)}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          {showAdvancedClustering ? 'Hide' : 'Show'} Advanced Options
                        </Button>
                        
                        {showAdvancedClustering && (
                          <div className="mt-3 p-3 bg-slate-700/30 rounded border border-slate-600 space-y-3">
                            <div>
                              <label className="text-xs text-slate-300 block mb-2">Minimum Cluster Size: {minClusterSize}</label>
                              <input
                                type="range"
                                min="2"
                                max="10"
                                value={minClusterSize}
                                onChange={(e) => setMinClusterSize(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-slate-500 mt-1">Clusters must have at least {minClusterSize} customers</p>
                            </div>
                            
                            <div>
                              <label className="text-xs text-slate-300 block mb-2">Maximum Cluster Radius: {maxClusterRadius} km</label>
                              <input
                                type="range"
                                min="5"
                                max="50"
                                step="5"
                                value={maxClusterRadius}
                                onChange={(e) => setMaxClusterRadius(Number(e.target.value))}
                                className="w-full"
                              />
                              <p className="text-xs text-slate-500 mt-1">Clusters cannot exceed {maxClusterRadius} km radius</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Cluster List Display */}
                  <div className="space-y-4">
                    {asArray(clusters).map((cluster) => {
                      const clusterCustomerIds = asArray(cluster.customers).map(c => c.id);
                      const allSelected = clusterCustomerIds.every(id => selectedCustomers.includes(id));
                      const someSelected = clusterCustomerIds.some(id => selectedCustomers.includes(id));

                      return (
                        <div key={cluster.id} className="border border-slate-600 rounded-lg p-4 bg-slate-700/30">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                                <Target className="w-5 h-5 text-purple-400" />
                              </div>
                              <div>
                                <h4 className="font-semibold text-white">Cluster {cluster.id}</h4>
                                <p className="text-xs text-slate-400">
                                  {cluster.customers.length} customers • {cluster.radius.toFixed(1)} km radius
                                </p>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant={allSelected ? "outline" : "default"}
                              onClick={() => selectAllInCluster(cluster.id)}
                              className={allSelected ? "border-blue-500 text-blue-400" : ""}
                            >
                              {allSelected ? "Deselect All" : someSelected ? "Select Remaining" : "Select All"}
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {asArray(cluster.customers).map((customer) => (
                              <div
                                key={customer.id}
                                onClick={() => toggleCustomer(customer.id)}
                                className={`p-2 rounded border cursor-pointer text-sm ${
                                  selectedCustomers.includes(customer.id)
                                    ? "bg-blue-600/20 border-blue-500"
                                    : "bg-slate-800/50 border-slate-600 hover:bg-slate-800"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-white font-medium">{customer.name}</span>
                                  {selectedCustomers.includes(customer.id) && (
                                    <CheckCircle className="w-4 h-4 text-blue-400" />
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 truncate">{customer.address}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}

                    {asArray(clusters).length === 0 && (
                      <div className="text-center py-12 text-slate-400">
                        <Target className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        <p>No clusters found with current radius. Try increasing the distance.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
              
              {/* Bottom Next Button */}
              <div className="flex justify-end mt-6">
                <Button
                  onClick={() => setStep(2)}
                  disabled={selectedCustomers.length === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Next: Choose Worker
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Choose Worker */}
        {step === 2 && (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Choose Worker</CardTitle>
              <CardDescription className="text-slate-400">
                Select a field worker to assign this route
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* A3: Supervisor picker */}
              <div className="mb-6">
                <Label className="text-slate-300 text-sm mb-2 block">Assign Supervisor (Optional)</Label>
                <Select
                  value={selectedSupervisor ? String(selectedSupervisor) : 'none'}
                  onValueChange={(val) => {
                    const id = val === 'none' ? null : Number(val);
                    setSelectedSupervisor(id);
                    validateSupervisorLotAccess(id, selectedCustomers);
                  }}
                >
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="No supervisor" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    <SelectItem value="none" className="text-slate-400">No supervisor</SelectItem>
                    {supervisors.map((sup: any) => {
                      // B4: Use fieldworkerId (workers.id) as the value so routes.supervisorId
                      // stores the workers table PK, not the Survey App MongoDB _id
                      const fieldworkerId = sup.fieldworkerId ?? null;
                      if (!fieldworkerId) return null; // skip supervisors not yet provisioned
                      const supId = String(fieldworkerId);
                      return (
                        <SelectItem key={supId} value={supId} className="text-white">
                          {sup.fullName} {sup.companyName ? `(${sup.companyName})` : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {/* A4: Lot-access hard block — route cannot be created until resolved */}
                {supervisorLotWarning && (
                  <div className="mt-2 p-3 bg-red-900/30 border border-red-600/50 rounded text-red-400 text-xs">
                    🚫 <strong>Route blocked:</strong> {supervisorLotWarning} Choose a supervisor with access to all selected lots, or remove the out-of-lot customers.
                  </div>
                )}
              </div>

              <Label className="text-slate-300 text-sm mb-2 block">Assign Field Manager</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {fieldManagers.filter((w: any) => w.status === "active").map((worker: any) => (
                  <div
                    key={worker.id}
                    onClick={() => setSelectedWorker(worker.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedWorker === worker.id
                        ? "bg-blue-600/20 border-blue-500"
                        : "bg-slate-700/30 border-slate-600 hover:bg-slate-700/50"
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-white">{worker.name}</h4>
                        <p className="text-xs text-slate-400">{worker.email}</p>
                      </div>
                      {selectedWorker === worker.id && (
                        <CheckCircle className="w-5 h-5 text-blue-400" />
                      )}
                    </div>
                    
                    <div className="text-xs text-slate-400 space-y-1">
                      <div>Shift: {worker.shiftStart} - {worker.shiftEnd}</div>
                      {worker.skills && (() => {
                        try {
                          const skills = typeof worker.skills === 'string' ? JSON.parse(worker.skills) : worker.skills;
                          return Array.isArray(skills) && skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {skills.slice(0, 2).map((skill: string, idx: number) => (
                                <span key={preset.id} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          ) : null;
                        } catch (e) {
                          return null;
                        }
                      })()}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} className="border-slate-600">
                  Back
                </Button>
                <div onClick={(e) => {
                  const el = e.target as HTMLElement;
                  if (el.closest('a[href], [role="link"]')) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}>
                  <button
                    type="button"
                    className="btn btn-primary bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid="optimize-route"
                    disabled={optimizing || !selectedCustomers?.length || !selectedWorker}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      e.stopPropagation(); 
                      handleOptimize(); 
                    }}
                  >
                    {optimizing ? "Optimizing…" : "Optimize Route"}
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Optimized Route */}
        {step === 3 && optimizedRoute && (
          <div className="space-y-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Optimized Route</CardTitle>
                <CardDescription className="text-slate-400">
                  Route has been optimized for maximum efficiency
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-4 bg-blue-600/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{Number(optimizedRoute.totalDistance).toFixed(2)}km</div>
                    <div className="text-xs text-slate-400">Total Distance</div>
                  </div>
                  <div className="text-center p-4 bg-green-600/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">
                      {(() => {
                        const hours = Math.floor(optimizedRoute.estimatedDuration);
                        const minutes = Math.round((optimizedRoute.estimatedDuration - hours) * 60);
                        return `${hours}h ${minutes}min`;
                      })()}
                    </div>
                    <div className="text-xs text-slate-400">Est. Duration</div>
                  </div>
                  <div className="text-center p-4 bg-purple-600/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-400">{optimizedRoute.customers.length}</div>
                    <div className="text-xs text-slate-400">Total Stops</div>
                  </div>
                  <div className="text-center p-4 bg-orange-600/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-400">{optimizedRoute.efficiencyScore}%</div>
                    <div className="text-xs text-slate-400">Efficiency</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Navigation className="w-4 h-4" />
                    Optimized Sequence
                  </h3>
                  {toList<any>(optimizedRoute?.optimizedSequence).map((customer: any, idx: number) => (
                    <div key={customer.id} className="flex items-center gap-3 p-3 bg-slate-700/30 rounded-lg">
                      <span className="w-6 h-6 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <h4 className="font-medium text-white text-sm">{customer.name}</h4>
                        <p className="text-xs text-slate-400">{customer.address}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        customer.priority === "high" ? "bg-red-600/20 text-red-400" :
                        customer.priority === "medium" ? "bg-yellow-600/20 text-yellow-400" :
                        "bg-green-600/20 text-green-400"
                      }`}>
                        {customer.priority}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(3)} className="border-slate-600">
                Back to Edit
              </Button>
              <Button onClick={handleCreateRoute} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Create & Assign Route
              </Button>
            </div>
          </div>
        )}
      </main>
    


      </div>
  );
}