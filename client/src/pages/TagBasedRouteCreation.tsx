import { useState, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import FieldManagerBreadcrumb from "@/components/FieldManagerBreadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Route, MapPin, Users, Zap } from "lucide-react";
import { toast } from "sonner";

interface FieldManagerTag {
  id: number;
  fieldManagerId: number;
  customermaf: string;
  description?: string;
}

export default function TagBasedRouteCreation() {
  const [selectedManager, setSelectedManager] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [routeName, setRouteName] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [isCreating, setIsCreating] = useState(false);

  // Queries
  const { data: workers = [], isLoading: workersLoading } = trpc.fieldWorker.getWorkers.useQuery();
  const { data: allTags = {}, isLoading: tagsLoading } = trpc.fieldWorker.getAllFieldManagerTags.useQuery();
  const { data: allCustomers = [], isLoading: customersLoading } = trpc.fieldWorker.getCustomers.useQuery();

  // Get tags for selected manager
  const managerTags = selectedManager ? (allTags[parseInt(selectedManager)] || []) as FieldManagerTag[] : [];

  // Get customers for selected tags
  const taggedCustomers = selectedTags.length > 0
    ? allCustomers.filter((c) => selectedTags.includes(c.customermaf || ""))
    : [];

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSelectAllTags = () => {
    if (selectedTags.length === managerTags.length) {
      setSelectedTags([]);
    } else {
      setSelectedTags(managerTags.map((t) => t.customermaf));
    }
  };

  const handleCreateRoute = async () => {
    if (!selectedManager) {
      toast.error("Please select a field manager");
      return;
    }

    if (selectedTags.length === 0) {
      toast.error("Please select at least one building ID");
      return;
    }

    if (!routeName.trim()) {
      toast.error("Please enter a route name");
      return;
    }

    setIsCreating(true);

    try {
      // In a real implementation, this would call a tRPC mutation to create the route
      // For now, we'll simulate the creation
      const routeData = {
        routeName,
        fieldManagerId: parseInt(selectedManager),
        customermafTags: JSON.stringify(selectedTags),
        scheduledDate: selectedDate,
        totalCustomers: taggedCustomers.length,
        status: "pending" as const,
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success(`Route "${routeName}" created with ${taggedCustomers.length} customers`);

      // Reset form
      setRouteName("");
      setSelectedTags([]);
      setSelectedDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      toast.error("Failed to create route");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedManagerName = workers.find((w) => w.id === parseInt(selectedManager))?.name;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <FieldManagerBreadcrumb />
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
            <Route className="w-10 h-10" />
            Tag-Based Route Creation
          </h1>
          <p className="text-slate-400">
            Create optimized routes by selecting building IDs assigned to field managers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Route Configuration */}
          <Card className="bg-slate-800 border-slate-700 lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-white">Route Configuration</CardTitle>
              <CardDescription>Set up your new route</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Route Name */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Route Name</label>
                <Input
                  value={routeName}
                  onChange={(e) => setRouteName(e.target.value)}
                  placeholder="e.g., Downtown Route A"
                  className="bg-slate-700 border-slate-600 text-white placeholder-slate-500"
                />
              </div>

              {/* Field Manager Selection */}
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

              {/* Scheduled Date */}
              <div>
                <label className="text-sm font-medium text-slate-300 mb-2 block">Scheduled Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCreateRoute}
                disabled={isCreating || !selectedManager || selectedTags.length === 0 || !routeName}
                className="w-full bg-green-600 hover:bg-green-700 text-white mt-6"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Route...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Route
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Tags & Customers Selection */}
          <Card className="bg-slate-800 border-slate-700 lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-white">Select Building IDs & Customers</CardTitle>
              <CardDescription>
                {selectedTags.length > 0
                  ? `${selectedTags.length} building ID${selectedTags.length !== 1 ? "s" : ""} selected (${taggedCustomers.length} customers)`
                  : "Choose building IDs to include in this route"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedManager ? (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">Select a field manager to view their assigned building IDs</p>
                </div>
              ) : tagsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                </div>
              ) : managerTags.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-400">No building IDs assigned to {selectedManagerName}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Select All Button */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-700">
                    <span className="text-sm font-medium text-slate-300">
                      Building IDs ({managerTags.length})
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-600"
                      onClick={handleSelectAllTags}
                    >
                      {selectedTags.length === managerTags.length ? "Deselect All" : "Select All"}
                    </Button>
                  </div>

                  {/* Tags Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                    {managerTags.map((tag) => {
                      const customersForTag = allCustomers.filter((c) => c.customermaf === tag.customermaf);
                      return (
                        <div
                          key={tag.id}
                          className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                            selectedTags.includes(tag.customermaf)
                              ? "bg-blue-900 border-blue-500"
                              : "bg-slate-700 border-slate-600 hover:border-slate-500"
                          }`}
                          onClick={() => handleTagToggle(tag.customermaf)}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={selectedTags.includes(tag.customermaf)}
                              onCheckedChange={() => handleTagToggle(tag.customermaf)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className="bg-blue-600 text-white font-mono text-xs">
                                  {tag.customermaf}
                                </Badge>
                                <span className="text-xs text-slate-400">
                                  {customersForTag.length} customer{customersForTag.length !== 1 ? "s" : ""}
                                </span>
                              </div>
                              {tag.description && (
                                <p className="text-xs text-slate-400">{tag.description}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Route Summary */}
        {selectedTags.length > 0 && (
          <Card className="bg-slate-800 border-slate-700 mt-6">
            <CardHeader>
              <CardTitle className="text-white">Route Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-400" />
                    <span className="text-sm text-slate-400">Route Name</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{routeName || "Not set"}</p>
                </div>

                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="text-sm text-slate-400">Building IDs</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{selectedTags.length}</p>
                </div>

                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-green-400" />
                    <span className="text-sm text-slate-400">Total Customers</span>
                  </div>
                  <p className="text-lg font-semibold text-white">{taggedCustomers.length}</p>
                </div>

                <div className="bg-slate-700 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Route className="w-5 h-5 text-purple-400" />
                    <span className="text-sm text-slate-400">Scheduled Date</span>
                  </div>
                  <p className="text-lg font-semibold text-white">
                    {new Date(selectedDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Selected Tags Display */}
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-sm font-medium text-slate-300 mb-3">Selected Building IDs:</p>
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge key={tag} className="bg-blue-600 text-white font-mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

