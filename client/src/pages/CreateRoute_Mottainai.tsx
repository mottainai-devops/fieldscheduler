import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Users, Truck, Zap, Navigation, CheckCircle, Target } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AppHeader from "@/components/AppHeader";
import RouteMap from "@/components/RouteMap";

// ---- safe list guards ----
const asArray = <T,>(v: T[] | T | undefined | null): T[] => Array.isArray(v) ? v : (v != null ? [v as T] : []);
const safeMap = <T, R>(v: T[] | undefined | null, fn: (x: T, i: number) => R): R[] =>
  Array.isArray(v) ? v.map(fn) : [];
const toList = <T,>(v: any): T[] => Array.isArray(v) ? v as T[] : (v == null ? [] : [].filter(()=>false));
const mapList = <T, U>(v: any, fn: (x:T,i:number)=>U) => toList<T>(v).map(fn);

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

  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: clustersByDistance = [], isLoading: loadingDistance } = trpc.fieldWorker.getCustomerClusters.useQuery(
    { maxDistance: clusterDistance },
    { 
      enabled: selectionMode === 'cluster' && clusterMode === 'distance',
      retry: false,
      refetchOnWindowFocus: false
    }
  );
  const { data: clustersByCount = [], isLoading: loadingCount } = trpc.fieldWorker.getCustomerClustersByCount.useQuery(
    { customersPerCluster },
    { 
      enabled: selectionMode === 'cluster' && clusterMode === 'count',
      retry: false,
      refetchOnWindowFocus: false
    }
  );
  const clusters = clusterMode === 'distance' ? clustersByDistance : clustersByCount;
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  const createRouteMutation = trpc.arcgis.calculateRoute.useMutation();

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
      setSelectedCustomers(prev => prev.filter(id => !clusterCustomerIds.includes(id)));
      toast.info(`Deselected ${clusterCustomerIds.length} customers from cluster`);
    } else {
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

  const handleOptimize = async () => {
    if (!Array.isArray(selectedCustomers) || selectedCustomers.length === 0) {
      toast.error("Pick at least 1 customer");
      return;
    }
    if (!selectedWorker) {
      toast.error("Pick a worker");
      return;
    }

    setOptimizing(true);
    
    try {
      // Call Mottainai optimization
      const result = await createRouteMutation.mutateAsync({
        stops: [],
        customerIds: selectedCustomers,
      });

      console.log("[Mottainai] Optimization result:", result);

      // Handle Mottainai response structure
      const apiRes: any = result;
      
      if (!apiRes.success) {
        throw new Error("Route optimization failed");
      }

      const selectedCustomerData = asArray(customers).filter(c => selectedCustomers.includes(c.id));
      
      setOptimizedRoute({
        customers: selectedCustomerData,
        optimizedSequence: apiRes.optimizedOrder || [],
        visualization: apiRes.visualization || {},
        summary: apiRes.summary || {},
        totalDistance: apiRes.summary?.totalDistance || 0,
        estimatedDuration: apiRes.summary?.totalDuration || 0,
        efficiencyScore: Math.max(50, Math.min(99, Math.round((selectedCustomers.length / 10) * 10))),
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
    
    try {
      await createRouteMutation.mutateAsync({
        workerId: selectedWorker,
        totalDistance: optimizedRoute.totalDistance,
        estimatedDuration: optimizedRoute.estimatedDuration,
        efficiencyScore: optimizedRoute.efficiencyScore,
        customerIds: selectedCustomers,
        scheduledDate: new Date().toISOString().split('T')[0],
      });
      
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
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {asArray(customers).map((customer: any) => (
                      <div
                        key={customer.id}
                        onClick={() => toggleCustomer(customer.id)}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                          selectedCustomers.includes(customer.id)
                            ? "border-blue-500 bg-blue-500/10"
                            : "border-slate-600 bg-slate-700/30 hover:border-slate-500"
                        }`}
                      >
                        <p className="font-medium text-white">{customer.name}</p>
                        <p className="text-sm text-slate-400">{customer.address}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Cluster Selection */}
                <TabsContent value="cluster" className="mt-4">
                  <div className="space-y-4">
                    {asArray(clusters).map((cluster: any) => (
                      <Card key={cluster.id} className="bg-slate-700/30 border-slate-600">
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="font-medium text-white">Cluster {cluster.id}</h4>
                              <p className="text-sm text-slate-400">{cluster.customers?.length || 0} customers</p>
                            </div>
                            <Button
                              onClick={() => selectAllInCluster(cluster.id)}
                              variant="outline"
                              size="sm"
                            >
                              {cluster.customers?.every((c: any) => selectedCustomers.includes(c.id)) ? 'Deselect All' : 'Select All'}
                            </Button>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {asArray(cluster.customers).map((customer: any) => (
                              <div
                                key={customer.id}
                                onClick={() => toggleCustomer(customer.id)}
                                className={`p-2 rounded border cursor-pointer text-sm ${
                                  selectedCustomers.includes(customer.id)
                                    ? "border-blue-500 bg-blue-500/10 text-blue-300"
                                    : "border-slate-600 text-slate-300 hover:border-slate-500"
                                }`}
                              >
                                {customer.name}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                {asArray(workers).map((worker: any) => (
                  <div
                    key={worker.id}
                    onClick={() => setSelectedWorker(worker.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition ${
                      selectedWorker === worker.id
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-slate-600 bg-slate-700/30 hover:border-slate-500"
                    }`}
                  >
                    <p className="font-medium text-white">{worker.name}</p>
                    <p className="text-sm text-slate-400">{worker.phone}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <Button onClick={() => setStep(1)} variant="outline">Back</Button>
                <Button 
                  onClick={() => handleOptimize()} 
                  disabled={!selectedWorker || optimizing}
                  className="flex-1"
                >
                  {optimizing ? "Optimizing..." : "Optimize Route"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Optimize */}
        {step === 3 && optimizedRoute && (
          <div className="space-y-6">
            {/* Route Map Visualization */}
            <RouteMap
              polylineCoordinates={optimizedRoute.visualization?.polylineCoordinates || []}
              snappedWaypoints={optimizedRoute.visualization?.snappedWaypoints || []}
              startingPoint={{ lat: 6.5244, lng: 3.3792 }}
              customerLocations={optimizedRoute.optimizedSequence.map((opt: any, idx: number) => {
                const customer = optimizedRoute.customers.find((c: any) => c.id === opt.customerId);
                return {
                  lat: customer?.latitude || 0,
                  lng: customer?.longitude || 0,
                  name: customer?.name || `Customer ${opt.customerId}`,
                  sequence: opt.sequence,
                };
              })}
              instructions={optimizedRoute.visualization?.instructions || []}
              distanceKm={optimizedRoute.visualization?.distanceKm || "0"}
              timeMinutes={optimizedRoute.visualization?.timeMinutes || 0}
            />

            {/* Route Summary */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Route Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-slate-400">Total Distance</p>
                    <p className="text-2xl font-bold text-white">{optimizedRoute.summary?.totalDistanceKm || "0"} km</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Estimated Time</p>
                    <p className="text-2xl font-bold text-white">{optimizedRoute.summary?.totalDurationMinutes || "0"} min</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Customers</p>
                    <p className="text-2xl font-bold text-white">{optimizedRoute.summary?.customerCount || "0"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Efficiency</p>
                    <p className="text-2xl font-bold text-white">{optimizedRoute.efficiencyScore}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Optimized Sequence */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Optimized Sequence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {optimizedRoute.optimizedSequence.map((opt: any, idx: number) => {
                    const customer = optimizedRoute.customers.find((c: any) => c.id === opt.customerId);
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-slate-700/30 rounded">
                        <Badge className="bg-blue-600">{opt.sequence}</Badge>
                        <div className="flex-1">
                          <p className="font-medium text-white">{customer?.name}</p>
                          <p className="text-sm text-slate-400">{customer?.address}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-300">{(opt.distance / 1000).toFixed(1)} km</p>
                          <p className="text-xs text-slate-400">{Math.round(opt.duration / 60)} min</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button onClick={() => setStep(2)} variant="outline" className="flex-1">Back</Button>
              <Button 
                onClick={handleCreateRoute}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Create Route
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

