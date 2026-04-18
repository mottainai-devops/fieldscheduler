import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Users, Truck, Calendar, CheckCircle, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import AppHeader from "@/components/AppHeader";
import CustomerAreaMap from "@/components/CustomerAreaMap";

interface Customer {
  id: number;
  name: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
  serviceType?: string;
  priority?: string;
}

export default function AreaRouteCreation() {
  const [, setLocation] = useLocation();
  const [selectedCustomers, setSelectedCustomers] = useState<Customer[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>("");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("none");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [primaryFilterType, setPrimaryFilterType] = useState<'building' | 'manager'>('building');
  const [filterBuilding, setFilterBuilding] = useState<string>("none");
  const [filterFieldManager, setFilterFieldManager] = useState<string>("none");
  const [filterAssignmentStatus, setFilterAssignmentStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [] } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: vehicles = [] } = trpc.fieldWorker.getVehicles.useQuery();
  const { data: routes = [] } = trpc.fieldWorker.getRoutes.useQuery();

  const createRouteMutation = trpc.fieldWorker.createRoute.useMutation();

  // Ensure state is properly initialized
  useEffect(() => {
    if (!filterBuilding) setFilterBuilding('none');
    if (!filterFieldManager) setFilterFieldManager('none');
    if (!filterAssignmentStatus) setFilterAssignmentStatus('all');
  }, []);

  // Get assigned customer IDs
  const assignedCustomerIds = new Set(
    routes.flatMap(route => route.customerIds || [])
  );

  // Filter unassigned customers
  let unassignedCustomers = customers.filter(
    customer => !assignedCustomerIds.has(customer.id)
  );

  // Apply primary filter (either building OR field manager, not both)
  if (primaryFilterType === 'building' && filterBuilding !== "none") {
    unassignedCustomers = unassignedCustomers.filter(
      customer => customer.customermaf === filterBuilding
    );
  } else if (primaryFilterType === 'manager' && filterFieldManager !== "none") {
    unassignedCustomers = unassignedCustomers.filter(
      customer => customer.fieldManager?.toString() === filterFieldManager
    );
  }
  
  // Apply assignment status sub-filter (only if not "all")
  if (filterAssignmentStatus !== "all") {
    unassignedCustomers = unassignedCustomers.filter(
      customer => customer.routeAssignmentStatus === filterAssignmentStatus
    );
  }
  
  // Apply search filter
  if (searchQuery) {
    unassignedCustomers = unassignedCustomers.filter(
      customer => customer.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // Get unique buildings and field managers for filters
  const uniqueBuildings = Array.from(
    new Set(
      customers
        .map(c => c.buildingId)
        .filter((b): b is string => typeof b === 'string' && b.length > 0)
    )
  ).sort();

  const uniqueFieldManagers = Array.from(
    new Set(
      customers
        .map(c => c.fieldManager)
        .filter((m): m is number => typeof m === 'number')
    )
  ).sort((a, b) => a - b);

  const hasActiveFilters = (filterBuilding && filterBuilding !== "none") || (filterFieldManager && filterFieldManager !== "none") || (filterAssignmentStatus && filterAssignmentStatus !== "all") || searchQuery;

  const clearFilters = () => {
    setFilterBuilding("none");
    setFilterFieldManager("none");
    setFilterAssignmentStatus("all");
    setSearchQuery("");
  };

  const handleCustomersSelected = (customers: Customer[]) => {
    setSelectedCustomers(customers);
  };

  const handleCreateRoute = async () => {
    if (selectedCustomers.length === 0) {
      toast.error("Please select at least one customer");
      return;
    }
    if (!selectedWorkerId) {
      toast.error("Please select a worker");
      return;
    }
    if (!scheduledDate) {
      toast.error("Please select a scheduled date");
      return;
    }

    try {
      const customerIds = selectedCustomers.map(c => c.id);
      await createRouteMutation.mutateAsync({
        name: `Area Route - ${new Date(scheduledDate).toLocaleDateString()}`,
        assignedWorkerId: parseInt(selectedWorkerId),
        vehicleId: selectedVehicleId ? parseInt(selectedVehicleId) : null,
        scheduledDate: new Date(scheduledDate),
        customerIds,
        status: "pending",
      });
      toast.success("Route created successfully!");
      setLocation("/routes");
    } catch (error: any) {
      toast.error(error.message || "Failed to create route");
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <AppHeader />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Create Route by Area</h1>
            <p className="text-slate-400 mt-2">Draw on the map to select customers in a geographic area</p>
          </div>
          <Button
            onClick={() => setLocation("/routes")}
            variant="outline"
            className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700"
          >
            Back to Routes
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
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
                {/* Primary Filter Type Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Filter By</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={primaryFilterType === 'building' ? 'default' : 'outline'}
                      onClick={() => {
                        setPrimaryFilterType('building');
                        setFilterFieldManager('none');
                      }}
                      className="flex-1 text-xs"
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
                      className="flex-1 text-xs"
                    >
                      Field Manager
                    </Button>
                  </div>
                </div>

                {/* Primary Filter Dropdown */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">
                    {primaryFilterType === 'building' ? 'Select Building' : 'Select Manager'}
                  </Label>
                  {primaryFilterType === 'building' ? (
                    <select
                      value={filterBuilding === undefined || filterBuilding === null ? "none" : filterBuilding}
                      onChange={(e) => setFilterBuilding(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                    >
                      <option value="none">All Buildings ({uniqueBuildings.length})</option>
                      {uniqueBuildings.map(building => (
                        <option key={building} value={building}>
                          {building}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={filterFieldManager === undefined || filterFieldManager === null ? "none" : filterFieldManager}
                      onChange={(e) => setFilterFieldManager(e.target.value)}
                      className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                    >
                      <option value="none">All Managers ({uniqueFieldManagers.length})</option>
                      {uniqueFieldManagers.map(managerId => (
                        <option key={managerId} value={String(managerId)}>
                          Worker {managerId}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Assignment Status Sub-Filter */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Assignment Status</Label>
                  <select
                    value={filterAssignmentStatus === undefined || filterAssignmentStatus === null ? "all" : filterAssignmentStatus}
                    onChange={(e) => setFilterAssignmentStatus(e.target.value)}
                    className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm"
                  >
                    <option value="all">All</option>
                    <option value="assigned">Assigned</option>
                    <option value="unassigned">Unassigned</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Showing {unassignedCustomers.length} unassigned customers
                  {hasActiveFilters && ` (filtered from ${customers.length} total)`}
                </div>
                {hasActiveFilters && (
                  <Button
                    onClick={clearFilters}
                    size="sm"
                    variant="ghost"
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

        {/* Map and Selection */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <Card className="bg-slate-800 border-slate-700 h-full">
              <CardContent className="pt-6 h-96">
                {unassignedCustomers.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400 mb-2">No customers to display</p>
                      <p className="text-slate-500 text-sm">
                        {hasActiveFilters ? "Try adjusting your filters" : "All customers are already assigned"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <CustomerAreaMap
                    customers={unassignedCustomers}
                    onCustomersSelected={handleCustomersSelected}
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Selection Panel */}
          <div className="space-y-4">
            {/* Selected Customers */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">
                  Selected Customers ({selectedCustomers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {selectedCustomers.length === 0 ? (
                    <p className="text-slate-400 text-sm">Draw on the map to select customers</p>
                  ) : (
                    selectedCustomers.map(customer => (
                      <div key={customer.id} className="text-xs text-slate-300 p-2 bg-slate-700 rounded">
                        {customer.name}
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Route Details */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-sm">Route Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Worker Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Assign to Worker</Label>
                  <Select value={selectedWorkerId} onValueChange={setSelectedWorkerId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select worker" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      {workers.map(worker => (
                        <SelectItem key={worker.id} value={worker.id.toString()} className="text-white">
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Vehicle (Optional)</Label>
                  <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-700 border-slate-600">
                      <SelectItem value="none" className="text-white">None</SelectItem>
                      {vehicles.map(vehicle => (
                        <SelectItem key={vehicle.id} value={vehicle.id.toString()} className="text-white">
                          {vehicle.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Date Selection */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Scheduled Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>

                {/* Create Button */}
                <Button
                  onClick={handleCreateRoute}
                  disabled={selectedCustomers.length === 0 || !selectedWorkerId || !scheduledDate}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Create Route
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

