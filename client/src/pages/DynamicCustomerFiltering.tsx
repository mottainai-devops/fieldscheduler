import { useState, useEffect, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Filter, Download, MapPin, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

interface Customer {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  customermaf?: string;
  latitude?: string;
  longitude?: string;
  priority?: string;
  buildingId?: string;
}

interface FieldManagerTag {
  id: number;
  fieldManagerId: number;
  customermaf: string;
  description?: string;
}

export default function DynamicCustomerFiltering() {
  const [selectedManager, setSelectedManager] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  // Queries
  const { data: workers = [], isLoading: workersLoading } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: allTags = {}, isLoading: tagsLoading } = trpc.fieldWorker.getAllFieldManagerTags.useQuery();
  const { data: allCustomers = [], isLoading: customersLoading } = trpc.fieldWorker.getCustomers.useQuery();

  // Get tags for selected manager
  const managerTags = selectedManager ? (allTags[parseInt(selectedManager)] || []) as FieldManagerTag[] : [];

  // Filter customers based on selected tags - memoized to prevent infinite loops
  const filteredCustomers = useMemo(() => {
    if (selectedTags.length === 0) {
      return [];
    }

    let filtered = allCustomers.filter((customer) =>
      selectedTags.includes(customer.customermaf || "")
    );

    // Apply search filter
    if (searchText) {
      const searchLower = searchText.toLowerCase();
      filtered = filtered.filter((c) =>
        c.name.toLowerCase().includes(searchLower) ||
        c.email?.toLowerCase().includes(searchLower) ||
        c.phone?.includes(searchText) ||
        c.buildingId?.toLowerCase().includes(searchLower)
      );
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter((c) => c.priority === priorityFilter);
    }

    return filtered;
  }, [selectedTags, allCustomers, searchText, priorityFilter]);

  const handleTagToggle = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }, []);

  const handleSelectAllTags = useCallback(() => {
    if (selectedTags.length === managerTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(managerTags.map((t) => t.customermaf));
    }
  }, [selectedTags.length, managerTags]);

  const handleExportCSV = useCallback(() => {
    if (filteredCustomers.length === 0) {
      toast.error("No customers to export");
      return;
    }

    setIsExporting(true);

    try {
      const headers = ["ID", "Name", "Email", "Phone", "Address", "Building ID", "Priority", "Latitude", "Longitude"];
      const rows = filteredCustomers.map((c) => [
        c.id,
        c.name,
        c.email || "",
        c.phone || "",
        c.address || "",
        c.buildingId || "",
        c.priority || "",
        c.latitude || "",
        c.longitude || "",
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `customers-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${filteredCustomers.length} customers`);
    } catch (error) {
      toast.error("Failed to export customers");
    } finally {
      setIsExporting(false);
    }
  }, [filteredCustomers]);

  const selectedManagerName = useMemo(
    () => workers.find((w) => w.id === parseInt(selectedManager))?.name,
    [workers, selectedManager]
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <FieldManagerBreadcrumb />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Filter className="w-10 h-10" />
            Dynamic Customer Filtering
          </h1>
          <p className="text-slate-400">
            Filter customers by Field Manager tags for targeted scheduling and operations
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Manager & Tags Selection */}
          <Card className="bg-slate-800 border-slate-700 lg:col-span-1 h-fit">
            <CardHeader>
              <CardTitle className="text-white">Filter by Manager</CardTitle>
              <CardDescription>Select tags to filter customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manager Selection */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Field Manager</label>
                <Select value={selectedManager} onValueChange={setSelectedManager}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={worker.id.toString()} className="text-white">
                        {worker.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tags Selection */}
              {selectedManager && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-slate-300">Building IDs ({managerTags.length})</label>
                    {managerTags.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs text-blue-400 hover:text-blue-300"
                        onClick={handleSelectAllTags}
                      >
                        {selectedTags.length === managerTags.length ? "Clear All" : "Select All"}
                      </Button>
                    )}
                  </div>

                  {tagsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    </div>
                  ) : managerTags.length === 0 ? (
                    <p className="text-sm text-slate-500">No tags assigned to this manager</p>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {managerTags.map((tag) => (
                        <div key={tag.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`tag-${tag.id}`}
                            checked={selectedTags.includes(tag.customermaf)}
                            onCheckedChange={() => handleTagToggle(tag.customermaf)}
                            className="border-slate-600"
                          />
                          <label
                            htmlFor={`tag-${tag.id}`}
                            className="text-sm text-slate-300 cursor-pointer flex-1 hover:text-white transition"
                          >
                            <span className="font-mono font-semibold">{tag.customermaf}</span>
                            {tag.description && (
                              <p className="text-xs text-slate-500 mt-1">{tag.description}</p>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Additional Filters */}
              {selectedTags.length > 0 && (
                <div className="pt-4 border-t border-slate-700 space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Search</label>
                    <Input
                      placeholder="Search by name, email, phone..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">Priority</label>
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="All priorities" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="" className="text-white">
                          All priorities
                        </SelectItem>
                        <SelectItem value="high" className="text-white">
                          High
                        </SelectItem>
                        <SelectItem value="medium" className="text-white">
                          Medium
                        </SelectItem>
                        <SelectItem value="low" className="text-white">
                          Low
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Main Content - Filtered Customers */}
          <Card className="bg-slate-800 border-slate-700 lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">
                  Filtered Customers ({filteredCustomers.length})
                </CardTitle>
                <CardDescription>
                  {selectedTags.length > 0
                    ? `Showing customers from ${selectedTags.length} building ID${selectedTags.length !== 1 ? "s" : ""}`
                    : "Select tags to view customers"}
                </CardDescription>
              </div>
              {filteredCustomers && filteredCustomers.length > 0 && (
                <Button
                  onClick={handleExportCSV}
                  disabled={isExporting}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </>
                  )}
                </Button>
              )}
            </CardHeader>

            <CardContent>
              {customersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                </div>
              ) : selectedTags.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-lg">Select building IDs to view customers</p>
                  <p className="text-sm text-slate-500 mt-2">Choose a field manager and select one or more tags</p>
                </div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400 text-lg">No customers found</p>
                  <p className="text-sm text-slate-500 mt-2">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {filteredCustomers && filteredCustomers.map((customer) => (
                    <div
                      key={customer.id}
                      className="bg-slate-700 p-4 rounded-lg border border-slate-600 hover:border-slate-500 transition"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white">{customer.name}</h3>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            <Badge className="bg-blue-600 text-white font-mono">{customer.customermaf}</Badge>
                            {customer.buildingId && (
                              <Badge className="bg-slate-600 text-slate-100">{customer.buildingId}</Badge>
                            )}
                            {customer.priority && (
                              <Badge
                                className={
                                  customer.priority === "high"
                                    ? "bg-red-600 text-white"
                                    : customer.priority === "medium"
                                      ? "bg-yellow-600 text-white"
                                      : "bg-green-600 text-white"
                                }
                              >
                                {customer.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        {customer.email && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Mail className="w-4 h-4 text-slate-500" />
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <Phone className="w-4 h-4 text-slate-500" />
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-start gap-2 text-slate-300 col-span-full">
                            <MapPin className="w-4 h-4 text-slate-500 mt-0.5 flex-shrink-0" />
                            <span>{customer.address}</span>
                          </div>
                        )}
                        {customer.latitude && customer.longitude && (
                          <div className="text-xs text-slate-400 col-span-full">
                            📍 {customer.latitude}, {customer.longitude}
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

        {/* Summary Stats */}
        {selectedTags.length > 0 && filteredCustomers && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">Selected Tags</p>
                  <p className="text-3xl font-bold text-blue-400">{selectedTags.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">Total Customers</p>
                  <p className="text-3xl font-bold text-green-400">{filteredCustomers.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-slate-400 text-sm mb-2">Manager</p>
                  <p className="text-xl font-bold text-white">{selectedManagerName || "-"}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

