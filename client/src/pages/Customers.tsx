import { useState, useEffect, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { Link } from "wouter";
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";

export default function Customers() {
  const { isAdmin, isFieldManager, fieldManagerId } = useAuth();
  const { data: customers = [], isLoading } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: workers = [] } = trpc.fieldWorker.getWorkers.useQuery();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFieldManager, setSelectedFieldManager] = useState("");
  const [selectedMAF, setSelectedMAF] = useState("");
  const [selectedCustomerType, setSelectedCustomerType] = useState("");
  const [selectedRouteStatus, setSelectedRouteStatus] = useState("");

  // Read search parameter from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, []);

  // Get unique MAF tags for selected field manager
  const availableMAFs = useMemo(() => {
    if (!selectedFieldManager) {
      // Show all MAFs if no field manager selected
      return [...new Set(customers.map(c => c.customermaf).filter(Boolean))].sort();
    }
    
    // Filter MAFs by selected field manager
    const fieldManagerId = selectedFieldManager === "unassigned" ? null : parseInt(selectedFieldManager);
    return [...new Set(
      customers
        .filter(c => c.fieldManager === fieldManagerId)
        .map(c => c.customermaf)
        .filter(Boolean)
    )].sort();
  }, [customers, selectedFieldManager]);

  // Get field managers with customer counts
  const fieldManagersWithCounts = useMemo(() => {
    const counts = customers.reduce((acc, c) => {
      const managerId = c.fieldManager || "unassigned";
      acc[managerId] = (acc[managerId] || 0) + 1;
      return acc;
    }, {} as Record<string | number, number>);

    return workers.map(w => ({
      ...w,
      count: counts[w.id] || 0
    })).concat([{
      id: "unassigned" as any,
      name: "Unassigned",
      count: counts["unassigned"] || 0
    }]);
  }, [customers, workers]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) => {
      // Search filter
      if (searchTerm && !customer.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Field Manager filter
      if (selectedFieldManager) {
        if (selectedFieldManager === "unassigned") {
          if (customer.fieldManager !== null) return false;
        } else {
          if (customer.fieldManager !== parseInt(selectedFieldManager)) return false;
        }
      }

      // MAF filter
      if (selectedMAF) {
        if (selectedMAF === "no_maf") {
          if (customer.customermaf !== null) return false;
        } else {
          if (customer.customermaf !== selectedMAF) return false;
        }
      }

      // Customer Type filter
      if (selectedCustomerType && customer.customerType !== selectedCustomerType) {
        return false;
      }

      // Route Assignment Status filter
      if (selectedRouteStatus && customer.routeAssignmentStatus !== selectedRouteStatus) {
        return false;
      }

      return true;
    });
  }, [customers, searchTerm, selectedFieldManager, selectedMAF, selectedCustomerType, selectedRouteStatus]);

  // Get field manager name
  const getFieldManagerName = (managerId: number | null) => {
    if (!managerId) return null;
    const manager = workers.find(w => w.id === managerId);
    return manager?.name || null;
  };

  // Quick stats
  const stats = useMemo(() => {
    const uniqueMAFs = new Set(customers.map(c => c.customermaf).filter(Boolean));
    const managersCount = new Set(customers.map(c => c.fieldManager).filter(Boolean)).size;
    const routeAssigned = customers.filter(c => c.routeAssignmentStatus === "assigned").length;
    const untreated = customers.filter(c => c.routeAssignmentStatus === "untreated").length;
    
    return {
      mafTags: uniqueMAFs.size,
      managers: managersCount,
      routeAssigned,
      untreated
    };
  }, [customers]);

  if (isLoading) {
    return <div className="p-8 text-center">Loading customers...</div>;
  }

  return (
    <>
      <AppHeader 
        title="Customers" 
        subtitle="Manage customer locations and details"
      />
      <div className="p-6">

      {/* Quick Stats */}
      <div className="mb-6 flex gap-4">
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg px-4 py-2">
          <span className="text-slate-400 text-sm">{stats.mafTags} MAF Tags</span>
        </div>
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg px-4 py-2">
          <span className="text-slate-400 text-sm">{stats.managers} Managers</span>
        </div>
        <div className="bg-green-600/20 border border-green-600 rounded-lg px-4 py-2">
          <span className="text-green-400 text-sm">{stats.routeAssigned} Route Assigned</span>
        </div>
        <div className="bg-yellow-600/20 border border-yellow-600 rounded-lg px-4 py-2">
          <span className="text-yellow-400 text-sm">{stats.untreated} Untreated</span>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search customers by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* 1. Field Manager Filter (Primary) - Hidden for field managers */}
        {isAdmin && (
        <div>
          <label className="block text-sm text-slate-400 mb-2">Filter by Field Manager</label>
          <select
            value={selectedFieldManager}
            onChange={(e) => {
              setSelectedFieldManager(e.target.value);
              setSelectedMAF(""); // Reset MAF when manager changes
            }}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Managers ({customers.length})</option>
            {fieldManagersWithCounts.map((manager) => (
              <option key={manager.id} value={manager.id}>
                {manager.name} ({manager.count})
              </option>
            ))}
          </select>
        </div>
        )}

        {/* 2. MAF Filter (Secondary - Optional) */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Filter by MAF</label>
          <select
            value={selectedMAF}
            onChange={(e) => setSelectedMAF(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All MAFs ({availableMAFs.length})</option>
            {availableMAFs.map((maf) => (
              <option key={maf} value={maf}>{maf}</option>
            ))}
            <option value="no_maf">No MAF</option>
          </select>
        </div>

        {/* 3. Customer Type Filter (Tertiary) */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Filter by Customer Type</label>
          <select
            value={selectedCustomerType}
            onChange={(e) => setSelectedCustomerType(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Types</option>
            <option value="residential">Residential</option>
            <option value="business">Business</option>
          </select>
        </div>

        {/* 4. Route Assignment Status Filter (Quaternary) */}
        <div>
          <label className="block text-sm text-slate-400 mb-2">Filter by Route Assignment Status</label>
          <select
            value={selectedRouteStatus}
            onChange={(e) => setSelectedRouteStatus(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Status</option>
            <option value="assigned">Route Assigned</option>
            <option value="unassigned">Route Unassigned</option>
            <option value="untreated">Untreated</option>
          </select>
        </div>
      </div>

      {/* Customer Locations */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-white mb-2">Customer Locations</h2>
        <p className="text-sm text-slate-400">Showing {filteredCustomers.length} of {customers.length} customers</p>
      </div>

      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          No customers found matching your filters
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Link key={customer.id} href={`/customers/${customer.id}`}>
              <div className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition-colors cursor-pointer">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-medium text-white">{customer.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    customer.customermaf ? "bg-blue-600/20 text-blue-400" :
                    "bg-gray-600/20 text-gray-400"
                  }`}>
                    {customer.customermaf || "No MAF"}
                  </span>
                </div>
                
                <p className="text-sm text-slate-400 mb-2">{customer.address}</p>
                
                {customer.latitude && customer.longitude && (
                  <p className="text-xs text-slate-500 mb-2">
                    📍 {customer.latitude}, {customer.longitude}
                  </p>
                )}

                {getFieldManagerName(customer.fieldManager) && (
                  <p className="text-sm text-purple-400">
                    Manager: {getFieldManagerName(customer.fieldManager)}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
