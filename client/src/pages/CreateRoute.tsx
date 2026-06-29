import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Users, Truck, Zap, Navigation, CheckCircle, Target, X, Save, Trash2, Settings, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import AppHeader from "@/components/AppHeader";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ChevronsUpDown, Check } from "lucide-react";
import { ROUTING_REASONS, type RoutingReasonValue, ROUTING_REASON_OTHER_MIN_CHARS } from '@shared/const';

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
  // 5A(b): Scheduled date for the route (default today)
  const [scheduledDate, setScheduledDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  // Tranche 6 Item 1: recurring route state
  const [isRecurring, setIsRecurring] = useState(false);
  const [cadence, setCadence] = useState<"daily" | "weekly" | "fortnightly" | "monthly">("weekly");
  const [recurrenceStartDate, setRecurrenceStartDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string>("");
  // 5A(d): Worker conflict state
  const [workerConflicts, setWorkerConflicts] = useState<Array<{ id: number; status: string }>>([]);

  // Tranche 9: Starting point state
  // resolvedStart is set by the optimizeRoute response and persisted on route save
  const [useCustomStart, setUseCustomStart] = useState(false);
  const [customStartLabel, setCustomStartLabel] = useState("");
  const [customStartLat, setCustomStartLat] = useState("");
  const [customStartLng, setCustomStartLng] = useState("");
  const [customStartError, setCustomStartError] = useState<string | null>(null);
  // resolvedStart is populated after a successful optimize call
  const [resolvedStart, setResolvedStart] = useState<{ lat: number; lng: number; label: string } | null>(null);

  // T16 Item 1: routing reason state
  const [routingReason, setRoutingReason] = useState<RoutingReasonValue | ''>('');
  const [routingReasonNote, setRoutingReasonNote] = useState('');
  // stopReasonOverrides: keyed by customerId (string), value is { reason, note }
  const [stopReasonOverrides, setStopReasonOverrides] = useState<Record<string, { reason: RoutingReasonValue; note: string }>>({});

  // A3: Supervisor picker state
  // selectedSupervisor holds the resolved workers.id (set after ensureSupervisorWorker on submit)
  // selectedSupervisorObj holds the full Survey App user object for display and lot-access validation
  const [selectedSupervisor, setSelectedSupervisor] = useState<number | null>(null);
  const [selectedSupervisorObj, setSelectedSupervisorObj] = useState<any>(null);
  const [supervisorPickerOpen, setSupervisorPickerOpen] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState("");
  const [supervisorLotWarning, setSupervisorLotWarning] = useState<string | null>(null);

  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();

  // Compute filteredCustomers early (as a stable memo) so clustering queries can pass the ID list
  const filteredCustomers = useMemo(() => {
    let result = asArray(customers);
    if (selectedFieldManager) {
      result = result.filter((c: any) => c.fieldManager?.toString() === selectedFieldManager);
    }
    if (selectedMAF) {
      result = result.filter((c: any) => c.customermaf === selectedMAF);
    }
    if (selectedCustomerType) {
      result = result.filter((c: any) => c.customerType === selectedCustomerType);
    }
    if (selectedRouteStatus) {
      result = result.filter((c: any) => c.routeAssignmentStatus === selectedRouteStatus);
    }
    if (searchQuery) {
      result = result.filter((c: any) => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [customers, selectedFieldManager, selectedMAF, selectedCustomerType, selectedRouteStatus, searchQuery]);

  const filteredCustomerIds = useMemo(() => filteredCustomers.map((c: any) => c.id), [filteredCustomers]);

  const { data: clustersByDistanceRaw = [], isLoading: loadingDistance } = trpc.fieldWorker.getCustomerClusters.useQuery(
    { clusterDistance: clusterDistance, customerIds: filteredCustomerIds },
    { 
      enabled: selectionMode === 'cluster' && clusterMode === 'distance' && filteredCustomerIds.length > 0,
      retry: false,
      refetchOnWindowFocus: false,
      onError: (err: any) => {
        toast.error(`Distance clustering failed: ${err.message ?? 'Unknown error'}`);
      },
    }
  );
  const { data: clustersByCountRaw = [], isLoading: loadingCount } = trpc.fieldWorker.getCustomerClustersByCount.useQuery(
    { customersPerCluster, customerIds: filteredCustomerIds },
    { 
      enabled: selectionMode === 'cluster' && clusterMode === 'count' && filteredCustomerIds.length > 0,
      retry: false,
      refetchOnWindowFocus: false,
      onError: (err: any) => {
        toast.error(`Count clustering failed: ${err.message ?? 'Unknown error'}`);
      },
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
  // 5A(d): Conflict detection — query routes for selected worker + scheduledDate
  const { data: conflictData, refetch: refetchConflicts } = trpc.fieldWorker.getWorkerRoutesOnDate.useQuery(
    { workerId: selectedWorker!, scheduledDate },
    { enabled: selectedWorker !== null && !!scheduledDate, retry: false }
  );
  // Keep workerConflicts in sync with query result
  const workerConflictRoutes = (conflictData ?? []) as Array<{ id: number; status: string }>;

  // A4: Lot-access validation — §2.3 v4.5.9 (cherry_picker exception)
  // Canonical rules (operator-confirmed):
  //   role = 'cherry_picker'    → UNRESTRICTED, always Full Coverage regardless of lots[]
  //   role = 'user'             → restricted by lots[]; lots:[] = hard block (No Lot Access)
  //   role = 'field_supervisor' → restricted by lots[]; lots:[] = hard block (No Lot Access)
  // Lot-code matching uses three equivalences (from workerAuth.ts):
  //   1. exact match: supLotCode === customerMaf
  //   2. leading-zero-stripped: supLotCode === customerMaf.replace(/^0+/, '')
  //   3. numeric fallback: parseInt(supLotCode) === parseInt(customerMaf)
  const lotCodesMatch = (supLotCode: string, customerMaf: string): boolean => {
    const s = String(supLotCode).trim();
    const c = String(customerMaf).trim();
    if (s === c) return true;
    if (s === c.replace(/^0+/, '')) return true;
    if (c === s.replace(/^0+/, '')) return true;
    const sn = parseInt(s, 10);
    const cn = parseInt(c, 10);
    if (!isNaN(sn) && !isNaN(cn) && sn === cn) return true;
    return false;
  };

  // Returns: { blocked: boolean; group: 'full_coverage'|'partial_coverage'|'no_access'; badge: string; unmatchedMafs: string[] }
  const checkSupervisorLotAccess = (supObj: any | null, customerIds: number[]): {
    blocked: boolean;
    group: 'full_coverage' | 'partial_coverage' | 'no_access';
    badge: string;
    unmatchedMafs: string[];
  } => {
    if (!supObj) return { blocked: false, group: 'full_coverage', badge: '', unmatchedMafs: [] };
    // cherry_picker: always unrestricted
    if (supObj.role === 'cherry_picker') {
      return { blocked: false, group: 'full_coverage', badge: '✓ Any Lot', unmatchedMafs: [] };
    }
    // user / field_supervisor: restricted by lots[]
    const supLots: any[] = supObj?.lots ?? supObj?.assignedLots ?? [];
    if (!supLots.length) {
      return { blocked: true, group: 'no_access', badge: '✗ No lot access', unmatchedMafs: [] };
    }
    if (customerIds.length === 0) {
      return { blocked: false, group: 'full_coverage', badge: `✓ ${supLots.length} lot${supLots.length !== 1 ? 's' : ''}`, unmatchedMafs: [] };
    }
    const selectedCustomerData = asArray(customers).filter(c => customerIds.includes(c.id));
    const unmatched = selectedCustomerData.filter(c => {
      const maf = (c.customermaf || '').trim();
      if (!maf) return false;
      return !supLots.some((l: any) => lotCodesMatch(String(l.lotCode), maf));
    });
    if (unmatched.length === 0) {
      return { blocked: false, group: 'full_coverage', badge: '✓ Full', unmatchedMafs: [] };
    }
    return {
      blocked: true,
      group: 'partial_coverage',
      badge: `✗ ${unmatched.length} lot${unmatched.length !== 1 ? 's' : ''} missing`,
      unmatchedMafs: unmatched.map(c => c.customermaf),
    };
  };

  const validateSupervisorLotAccess = (supObj: any | null, customerIds: number[]) => {
    if (!supObj || customerIds.length === 0) {
      setSupervisorLotWarning(null);
      return;
    }
    const { blocked, group, unmatchedMafs } = checkSupervisorLotAccess(supObj, customerIds);
    if (group === 'no_access') {
      setSupervisorLotWarning('__no_access__');
    } else if (blocked && group === 'partial_coverage') {
      const listed = unmatchedMafs.slice(0, 3).join(', ');
      const extra = unmatchedMafs.length > 3 ? ` +${unmatchedMafs.length - 3} more` : '';
      setSupervisorLotWarning(`__blocked__:${listed}${extra}`);
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

  // filteredCustomers is now computed as a useMemo above the clustering queries
  
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
    // Worker (supervisor or field manager) is only required at createRoute, not here.
    // The mutation only sends { customerIds }; worker assignment happens at step 3.

    console.log("[OPTIMIZE] payload", {
      selectedCustomers,
    });

    // Tranche 9: validate custom start if toggled on
    if (useCustomStart) {
      const hasLabel = customStartLabel.trim() !== "";
      const hasLat = customStartLat.trim() !== "";
      const hasLng = customStartLng.trim() !== "";
      if (!hasLabel || !hasLat || !hasLng) {
        toast.error("Custom starting point: all three fields (Label, Latitude, Longitude) are required.");
        return;
      }
      const latV = parseFloat(customStartLat);
      const lngV = parseFloat(customStartLng);
      if (!Number.isFinite(latV) || latV < -90 || latV > 90) {
        toast.error("Custom starting point: Latitude must be between -90 and 90.");
        return;
      }
      if (!Number.isFinite(lngV) || lngV < -180 || lngV > 180) {
        toast.error("Custom starting point: Longitude must be between -180 and 180.");
        return;
      }
    }

    setOptimizing(true);
    
    try {
      // Call the OSRM optimization
      const optimizePayload: any = {
        customerIds: selectedCustomers,
        workerId: selectedWorker ?? undefined,
      };
      if (useCustomStart && customStartLat && customStartLng) {
        optimizePayload.customStartLat = parseFloat(customStartLat);
        optimizePayload.customStartLng = parseFloat(customStartLng);
        optimizePayload.customStartLabel = customStartLabel.trim() || undefined;
      }
      const result = await optimizeRouteMutation.mutateAsync(optimizePayload);

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

      // Tranche 9: capture resolved starting point for display and persistence
      if (result.startingPointLat != null && result.startingPointLng != null) {
        setResolvedStart({
          lat: result.startingPointLat,
          lng: result.startingPointLng,
          label: result.startingPointLabel || 'Starting Point',
        });
      }
      
      setStep(3);
      toast.success("Route optimized successfully!");
    } catch (error: any) {
      console.error("Route optimization error:", error);
      // Tranche 9: surface PRECONDITION_FAILED as a clear blocking message
      const msg = error?.message || "Unknown error";
      if (msg.includes('no valid home depot') || error?.data?.code === 'PRECONDITION_FAILED') {
        toast.error(`Cannot optimize route: ${msg}`, { duration: 8000 });
      } else {
        toast.error(`Optimization failed: ${msg}`);
      }
    } finally {
      setOptimizing(false);
    }
  };

  const handleCreateRoute = async () => {
    if (!optimizedRoute) {
      toast.error("Please complete all steps before creating the route");
      return;
    }
    // T15 Item 4: Supervisor is now optional. If no supervisor is selected, the server
    // writes status='pending_assignment' and the route appears in the Pending Assignments queue.
    // A field manager (workerId) is still required.
    if (!selectedWorker) {
      toast.error("Select a field manager before creating the route.");
      return;
    }
    // A4: Hard block if supervisor has no lot access or partial coverage
    if (selectedSupervisorObj && (supervisorLotWarning?.startsWith('__blocked__') || supervisorLotWarning === '__no_access__')) {
      const detail = supervisorLotWarning === '__no_access__'
        ? 'supervisor has no lot assignments'
        : supervisorLotWarning.replace('__blocked__:', '');
      toast.error(`Route blocked: ${detail}. Choose a supervisor with full lot coverage or remove the out-of-lot customers.`);
      return;
    }
    // T16 follow-up: routing reason validation gates (client-side, mirrors server-side defense in depth)
    if (!isRecurring && !routingReason) {
      toast.error('Select a routing reason for this one-off route.');
      return;
    }
    if (routingReason === 'other' && (!routingReasonNote || routingReasonNote.length < ROUTING_REASON_OTHER_MIN_CHARS)) {
      toast.error(`Note must be at least ${ROUTING_REASON_OTHER_MIN_CHARS} characters when reason is 'Other'.`);
      return;
    }

    try {
      const routeData = {
        workerId: selectedWorker ?? undefined,
        // §2.3 v4.5.7: pass Survey App user id + name/email so the server can call
        // ensureSupervisorWorker and resolve the local workers.id automatically.
        // supervisorId is left undefined here; the server resolves it from surveyAppSupervisorId.
        surveyAppSupervisorId: selectedSupervisorObj ? String(selectedSupervisorObj.id) : undefined,
        surveyAppSupervisorName: selectedSupervisorObj?.fullName ?? undefined,
        surveyAppSupervisorEmail: selectedSupervisorObj?.email ?? undefined,
        totalDistance: String(optimizedRoute.totalDistance || 0),
        estimatedDuration: String(optimizedRoute.estimatedDuration || 0),
        efficiencyScore: Number(optimizedRoute.efficiencyScore || 50),
        customerIds: selectedCustomers.filter(id => typeof id === 'number' && !isNaN(id)),
        scheduledDate: scheduledDate,  // 5A(b): use admin-selected date
        // T15 Item 4: status is omitted — the server decides:
        //   - supervisor provided → 'assigned'
        //   - no supervisor      → 'pending_assignment'
        // Tranche 6 Item 1: recurring route fields
        isRecurring: isRecurring ? 1 : 0,
        cadence: isRecurring ? cadence : undefined,
        recurrenceStartDate: isRecurring ? recurrenceStartDate : undefined,
        recurrenceEndDate: isRecurring && recurrenceEndDate ? recurrenceEndDate : undefined,
        // Tranche 9: persist the actual starting point used for this route
        startingPointLat: resolvedStart?.lat ?? undefined,
        startingPointLng: resolvedStart?.lng ?? undefined,
        startingPointLabel: resolvedStart?.label ?? undefined,
        // T16 Item 1: routing reason write path
        routingReason: routingReason || undefined,
        routingReasonNote: (routingReason === 'other' && routingReasonNote) ? routingReasonNote : undefined,
        stopReasonOverrides: Object.keys(stopReasonOverrides).length > 0
          ? Object.fromEntries(
              Object.entries(stopReasonOverrides).map(([id, v]) => [id, { reason: v.reason, note: v.note || undefined }])
            )
          : undefined,
      };
      
      console.log("[CREATE ROUTE] Sending data:", routeData);
      console.log("[CREATE ROUTE] selectedWorker:", selectedWorker);
      console.log("[CREATE ROUTE] selectedCustomers:", selectedCustomers);
      console.log("[CREATE ROUTE] optimizedRoute:", optimizedRoute);
      
      await createRouteMutation.mutateAsync(routeData);
      
      const successMsg = selectedSupervisorObj
        ? "Route created and assigned successfully!"
        : "Route created. Assign a supervisor from the Pending Assignments page.";
      toast.success(successMsg);
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

                    {asArray(clusters).length === 0 && !loadingDistance && !loadingCount && (
                      <div className="text-center py-12 text-slate-400">
                        <Target className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                        {clusterMode === 'distance' ? (
                          <>
                            <p className="font-medium">No clusters found for the current radius.</p>
                            <p className="text-sm mt-1">
                              {filteredCustomers.length === 0
                                ? 'Apply a Field Manager or MAF filter first to select a customer subset.'
                                : `Try increasing the Distance Radius (currently ${clusterDistance} km) or reducing the Minimum Cluster Size.`}
                            </p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">No clusters found.</p>
                            <p className="text-sm mt-1">
                              {filteredCustomers.length === 0
                                ? 'Apply a Field Manager or MAF filter first to select a customer subset.'
                                : `${filteredCustomers.length} customer${filteredCustomers.length === 1 ? '' : 's'} filtered — try reducing Customers per Cluster (currently ${customersPerCluster}).`}
                            </p>
                          </>
                        )}
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
              {/* A3: Supervisor picker — typeahead combobox (§2.3 v4.5.7) */}
              {/* All Survey App users with role user/cherry_picker/field_supervisor are eligible. */}
              {/* Shadow row is provisioned by ensureSupervisorWorker on the server at route-creation time. */}
              <div className="mb-6">
                <Label className="text-slate-300 text-sm mb-2 block">Assign Supervisor (Optional)</Label>
                <Popover open={supervisorPickerOpen} onOpenChange={setSupervisorPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={supervisorPickerOpen}
                      className="w-full justify-between bg-slate-700 border-slate-600 text-white hover:bg-slate-600 hover:text-white"
                    >
                      {selectedSupervisorObj
                        ? `${selectedSupervisorObj.fullName}${selectedSupervisorObj.companyName ? ` (${selectedSupervisorObj.companyName})` : ''}`
                        : "No supervisor"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0 bg-slate-800 border-slate-600">
                    <Command className="bg-slate-800">
                      <CommandInput
                        placeholder="Search by name, email, or company..."
                        value={supervisorSearch}
                        onValueChange={setSupervisorSearch}
                        className="text-white placeholder:text-slate-400"
                      />
                      <CommandList>
                        <CommandEmpty className="text-slate-400 py-3 text-center text-sm">
                          {(supervisorsData as any)?.error
                            ? `Error: ${(supervisorsData as any).error}`
                            : supervisors.length === 0
                            ? "Loading supervisors..."
                            : "No supervisor found."}
                        </CommandEmpty>
                        {/* Clear selection */}
                        <CommandGroup>
                          <CommandItem
                            value="__none__"
                            onSelect={() => {
                              setSelectedSupervisorObj(null);
                              setSelectedSupervisor(null);
                              setSupervisorLotWarning(null);
                              setSupervisorPickerOpen(false);
                              setSupervisorSearch("");
                            }}
                            className="text-slate-400 cursor-pointer"
                          >
                            <Check className={`mr-2 h-4 w-4 ${!selectedSupervisorObj ? 'opacity-100' : 'opacity-0'}`} />
                            No supervisor
                          </CommandItem>
                        </CommandGroup>
                        {/* Grouped picker: Full Coverage → Partial Coverage → No Lot Access */}
                        {/* cherry_picker role: always Full Coverage / ✓ Any Lot */}
                        {/* user / field_supervisor with lots:[]: No Lot Access / hard-blocked */}
                        {(() => {
                          const q = supervisorSearch.toLowerCase();
                          const filtered = supervisors.filter((sup: any) => {
                            if (!q) return true;
                            return (
                              (sup.fullName || '').toLowerCase().includes(q) ||
                              (sup.email || '').toLowerCase().includes(q) ||
                              (sup.companyName || '').toLowerCase().includes(q) ||
                              (sup.defaultLotCode || '').toLowerCase().includes(q) ||
                              (sup.lots || []).some((l: any) => String(l.lotCode).toLowerCase().includes(q))
                            );
                          });
                          const fullCoverage: any[] = [];
                          const partialCoverage: any[] = [];
                          const noAccess: any[] = [];
                          filtered.forEach((sup: any) => {
                            const { group } = checkSupervisorLotAccess(sup, selectedCustomers);
                            if (group === 'full_coverage') fullCoverage.push(sup);
                            else if (group === 'partial_coverage') partialCoverage.push(sup);
                            else noAccess.push(sup);
                          });
                          const renderItem = (sup: any, coverageBadge?: React.ReactNode) => (
                            <CommandItem
                              key={String(sup.id)}
                              value={`${sup.fullName} ${sup.email} ${sup.companyName || ''}`}
                              onSelect={() => {
                                setSelectedSupervisorObj(sup);
                                setSelectedSupervisor(null);
                                validateSupervisorLotAccess(sup, selectedCustomers);
                                setSupervisorPickerOpen(false);
                                setSupervisorSearch('');
                              }}
                              className="text-white cursor-pointer"
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedSupervisorObj && String(selectedSupervisorObj.id) === String(sup.id)
                                    ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium truncate">{sup.fullName}</span>
                                  {coverageBadge}
                                </div>
                                <span className="text-xs text-slate-400 truncate">
                                  {sup.email}{sup.companyName ? ` · ${sup.companyName}` : ''}
                                  {sup.role === 'cherry_picker' ? ' · cherry picker' : sup.lots?.length ? ` · ${sup.lots.length} lot${sup.lots.length !== 1 ? 's' : ''}` : ''}
                                </span>
                              </div>
                            </CommandItem>
                          );
                          return (
                            <>
                              {fullCoverage.length > 0 && (
                                <CommandGroup heading={selectedCustomers.length > 0 ? `Full Coverage (${fullCoverage.length})` : `Available (${fullCoverage.length})`}>
                                  {fullCoverage.map(sup => {
                                    const { badge } = checkSupervisorLotAccess(sup, selectedCustomers);
                                    return renderItem(sup,
                                      selectedCustomers.length > 0
                                        ? <span className="text-xs text-green-400 shrink-0">{badge}</span>
                                        : undefined
                                    );
                                  })}
                                </CommandGroup>
                              )}
                              {partialCoverage.length > 0 && (
                                <CommandGroup heading={`Partial Coverage (${partialCoverage.length})`}>
                                  {partialCoverage.map(sup => {
                                    const { badge } = checkSupervisorLotAccess(sup, selectedCustomers);
                                    return renderItem(sup,
                                      <span className="text-xs text-red-400 shrink-0">{badge}</span>
                                    );
                                  })}
                                </CommandGroup>
                              )}
                              {noAccess.length > 0 && (
                                <CommandGroup heading={`No Lot Access (${noAccess.length})`}>
                                  {noAccess.map(sup => renderItem(sup,
                                    <span className="text-xs text-red-400 shrink-0">✗ No lot access</span>
                                  ))}
                                </CommandGroup>
                              )}
                            </>
                          );
                        })()}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {/* A4: Hard block — partial coverage (lots assigned but gap exists) */}
                {supervisorLotWarning?.startsWith('__blocked__') && (
                  <div className="mt-2 p-3 bg-red-900/30 border border-red-600/50 rounded text-red-400 text-xs">
                    🚫 <strong>Route blocked:</strong> This supervisor does not cover all selected customer lots ({supervisorLotWarning.replace('__blocked__:', '')}). Choose a supervisor with full lot coverage, or remove the out-of-lot customers.
                  </div>
                )}
                {/* A4: Hard block — no lot access (user/field_supervisor with lots:[]) */}
                {supervisorLotWarning === '__no_access__' && (
                  <div className="mt-2 p-3 bg-red-900/30 border border-red-600/50 rounded text-red-400 text-xs">
                    🚫 <strong>Route blocked:</strong> This supervisor has no lot assignments in the Survey App. Assign lots to this supervisor first, or choose a different supervisor.
                  </div>
                )}
              </div>

              <Label className="text-slate-300 text-sm mb-2 block">Assign Field Manager <span className="text-slate-500 font-normal">(Optional — at least one of supervisor or field manager required)</span></Label>
              {/* 5A(d): Worker conflict warning */}
              {workerConflictRoutes.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded text-yellow-300 text-xs">
                  ⚠️ <strong>Scheduling conflict:</strong> The selected field manager already has {workerConflictRoutes.length} route{workerConflictRoutes.length > 1 ? 's' : ''} on {scheduledDate} (Route{workerConflictRoutes.length > 1 ? 's' : ''} #{workerConflictRoutes.map(r => r.id).join(', #')}). You can still proceed, but consider reassigning.
                </div>
              )}
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
                      {/* Tranche 9: depot indicator on worker card */}
                      {(worker as any).homeDepotLabel ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <MapPin className="w-3 h-3" />
                          <span className="truncate">{(worker as any).homeDepotLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400">
                          <AlertTriangle className="w-3 h-3" />
                          <span className="italic">No depot — optimization will fail</span>
                        </div>
                      )}
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
              
              {/* Tranche 9 Item 4: Starting Point section */}
              <div className="mt-6 border border-slate-600 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-400">Starting Point</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{useCustomStart ? 'Custom coordinates' : "Worker's depot"}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={useCustomStart}
                      onClick={() => { setUseCustomStart(v => !v); setCustomStartError(null); }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        useCustomStart ? 'bg-amber-500' : 'bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        useCustomStart ? 'translate-x-5' : 'translate-x-1'
                      }`} />
                    </button>
                    <span className="text-xs text-slate-400">Override</span>
                  </div>
                </div>

                {!useCustomStart && (
                  <div className="text-xs">
                    {selectedWorker ? (() => {
                      const w = fieldManagers.find((fm: any) => fm.id === selectedWorker) as any;
                      if (!w) return null;
                      if (w.homeDepotLabel && w.homeDepotLat != null && w.homeDepotLng != null) {
                        return (
                          <div className="flex items-center gap-2 text-green-400 bg-green-900/20 border border-green-700/40 rounded px-3 py-2">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>Starting from: <strong>{w.homeDepotLabel}</strong> ({Number(w.homeDepotLat).toFixed(6)}, {Number(w.homeDepotLng).toFixed(6)})</span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="flex items-start gap-2 text-red-300 bg-red-900/20 border border-red-700/40 rounded px-3 py-2">
                            <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                            <span>
                              Cannot optimize route. Worker <strong>{w.name}</strong> has no depot set.
                              Go to <strong>Workers admin → edit {w.name} → set Home Depot</strong>, then return here.
                            </span>
                          </div>
                        );
                      }
                    })() : (
                      <div className="text-slate-500 italic">Select a field manager above to see their depot.</div>
                    )}
                  </div>
                )}

                {useCustomStart && (
                  <div className="space-y-2">
                    <div className="grid gap-1">
                      <Label className="text-slate-300 text-xs">Depot Label</Label>
                      <Input
                        value={customStartLabel}
                        onChange={(e) => { setCustomStartLabel(e.target.value); setCustomStartError(null); }}
                        placeholder="e.g. Test Asokoro Abuja"
                        className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="grid gap-1">
                        <Label className="text-slate-300 text-xs">Latitude (-90 to 90)</Label>
                        <Input
                          type="number"
                          step="any"
                          value={customStartLat}
                          onChange={(e) => { setCustomStartLat(e.target.value); setCustomStartError(null); }}
                          placeholder="9.0579"
                          className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                        />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-slate-300 text-xs">Longitude (-180 to 180)</Label>
                        <Input
                          type="number"
                          step="any"
                          value={customStartLng}
                          onChange={(e) => { setCustomStartLng(e.target.value); setCustomStartError(null); }}
                          placeholder="7.4951"
                          className="bg-slate-700 border-slate-600 text-white text-sm h-8"
                        />
                      </div>
                    </div>
                    {customStartError && (
                      <div className="flex items-start gap-2 p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-300">
                        <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                        {customStartError}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-4">
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
                    disabled={optimizing || !selectedCustomers?.length || (!selectedWorker && !selectedSupervisorObj)}
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
            {/* 5A(b): Scheduled date picker */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">Schedule Date</CardTitle>
                <CardDescription className="text-slate-400">Choose the date this route will be executed</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 mb-4">
                  <Label className="text-slate-300 text-sm w-32 flex-shrink-0">Scheduled Date</Label>
                  <input
                    type="date"
                    value={scheduledDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-400 text-xs">(defaults to today)</span>
                </div>

                {/* Tranche 6 Item 1: Recurring Route toggle */}
                <div className="border-t border-slate-700 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isRecurring}
                      onClick={() => setIsRecurring(v => !v)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isRecurring ? 'bg-blue-600' : 'bg-slate-600'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isRecurring ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                    <Label className="text-slate-300 text-sm cursor-pointer" onClick={() => setIsRecurring(v => !v)}>
                      Recurring Route
                    </Label>
                    {isRecurring && (
                      <span className="text-xs bg-blue-600/20 text-blue-400 px-2 py-0.5 rounded">Enabled</span>
                    )}
                  </div>

                  {isRecurring && (
                    <div className="space-y-3 pl-4 border-l-2 border-blue-600/40">
                      {/* Cadence */}
                      <div className="flex items-center gap-3">
                        <Label className="text-slate-300 text-sm w-32 flex-shrink-0">Cadence</Label>
                        <Select value={cadence} onValueChange={(v) => setCadence(v as typeof cadence)}>
                          <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-700 border-slate-600">
                            <SelectItem value="daily" className="text-white">Daily</SelectItem>
                            <SelectItem value="weekly" className="text-white">Weekly</SelectItem>
                            <SelectItem value="fortnightly" className="text-white">Fortnightly</SelectItem>
                            <SelectItem value="monthly" className="text-white">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Recurrence Start Date */}
                      <div className="flex items-center gap-3">
                        <Label className="text-slate-300 text-sm w-32 flex-shrink-0">Start Date</Label>
                        <input
                          type="date"
                          value={recurrenceStartDate}
                          onChange={(e) => setRecurrenceStartDate(e.target.value)}
                          className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      {/* Recurrence End Date */}
                      <div className="flex items-center gap-3">
                        <Label className="text-slate-300 text-sm w-32 flex-shrink-0">End Date</Label>
                        <input
                          type="date"
                          value={recurrenceEndDate}
                          min={recurrenceStartDate}
                          onChange={(e) => setRecurrenceEndDate(e.target.value)}
                          className="bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-slate-400 text-xs">(optional)</span>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* T16 Item 1: Routing Reason Card */}
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-base">Routing Reason <span className="text-slate-500 font-normal text-sm">(Optional)</span></CardTitle>
                <CardDescription className="text-slate-400">Record why this route is being created and optionally override the reason per stop</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Route-level reason */}
                <div className="flex items-center gap-3">
                  <Label className="text-slate-300 text-sm w-32 flex-shrink-0">Route Reason</Label>
                  <Select value={routingReason} onValueChange={(v) => setRoutingReason(v as RoutingReasonValue)}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-48">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {ROUTING_REASONS.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-white">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {routingReason && (
                    <button type="button" onClick={() => { setRoutingReason(''); setRoutingReasonNote(''); }} className="text-xs text-slate-400 hover:text-white underline">
                      Clear
                    </button>
                  )}
                </div>

                {/* Note — only shown when reason = 'other' */}
                {routingReason === 'other' && (
                  <div className="flex items-start gap-3">
                    <Label className="text-slate-300 text-sm w-32 flex-shrink-0 pt-2">Note</Label>
                    <div className="flex-1">
                      <textarea
                        value={routingReasonNote}
                        onChange={(e) => setRoutingReasonNote(e.target.value)}
                        placeholder={`Describe the reason (min ${ROUTING_REASON_OTHER_MIN_CHARS} characters)`}
                        rows={2}
                        className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      {routingReasonNote.length > 0 && routingReasonNote.length < ROUTING_REASON_OTHER_MIN_CHARS && (
                        <p className="text-xs text-yellow-400 mt-1">{ROUTING_REASON_OTHER_MIN_CHARS - routingReasonNote.length} more characters needed</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Per-stop overrides */}
                {toList<any>(optimizedRoute?.optimizedSequence).length > 0 && (
                  <div className="border-t border-slate-700 pt-4">
                    <p className="text-slate-400 text-xs mb-3">Override reason per stop (leave blank to inherit route reason)</p>
                    <div className="space-y-2">
                      {toList<any>(optimizedRoute?.optimizedSequence).map((customer: any, idx: number) => {
                        const override = stopReasonOverrides[String(customer.id)];
                        return (
                          <div key={customer.id} className="flex items-center gap-3 p-2 bg-slate-700/30 rounded">
                            <span className="w-5 h-5 bg-blue-600/20 text-blue-400 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">{idx + 1}</span>
                            <span className="text-white text-sm flex-1 truncate">{customer.name}</span>
                            <Select
                              value={override?.reason ?? ''}
                              onValueChange={(v) => {
                                if (!v) {
                                  setStopReasonOverrides(prev => { const n = { ...prev }; delete n[String(customer.id)]; return n; });
                                } else {
                                  setStopReasonOverrides(prev => ({ ...prev, [String(customer.id)]: { reason: v as RoutingReasonValue, note: prev[String(customer.id)]?.note ?? '' } }));
                                }
                              }}
                            >
                              <SelectTrigger className="bg-slate-700 border-slate-600 text-white w-36 text-xs h-8">
                                <SelectValue placeholder="Inherit" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-700 border-slate-600">
                                <SelectItem value="__clear__" className="text-slate-400 text-xs">Inherit route reason</SelectItem>
                                {ROUTING_REASONS.map(r => (
                                  <SelectItem key={r.value} value={r.value} className="text-white text-xs">{r.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {override?.reason === 'other' && (
                              <input
                                type="text"
                                placeholder="Note..."
                                value={override.note ?? ''}
                                onChange={(e) => setStopReasonOverrides(prev => ({ ...prev, [String(customer.id)]: { ...prev[String(customer.id)], note: e.target.value } }))}
                                className="bg-slate-700 border border-slate-600 text-white rounded px-2 py-1 text-xs w-36 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

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