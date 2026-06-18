import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Filter, Save, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

interface FilterPreset {
  id: string;
  name: string;
  filters: {
    status?: string[];
    priority?: string[];
    manager?: string[];
    dateRange?: { start: string; end: string };
    customermaf?: string[];
  };
  createdAt: Date;
}

export default function AdvancedFilters() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [selectedFilters, setSelectedFilters] = useState({
    status: [] as string[],
    priority: [] as string[],
    manager: [] as string[],
    dateRange: { start: "", end: "" },
    customermaf: [] as string[],
  });

  // Load presets from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("filterPresets");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setPresets(parsed.map((p: any) => ({ ...p, createdAt: new Date(p.createdAt) })));
      } catch (error) {
        console.error("Failed to load presets:", error);
      }
    }
  }, []);

  // Save presets to localStorage
  const savePresetsToStorage = (newPresets: FilterPreset[]) => {
    localStorage.setItem("filterPresets", JSON.stringify(newPresets));
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      toast.error("Please enter a preset name");
      return;
    }

    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name: presetName,
      filters: selectedFilters,
      createdAt: new Date(),
    };

    const updated = [...presets, newPreset];
    setPresets(updated);
    savePresetsToStorage(updated);
    setPresetName("");
    toast.success(`Preset "${presetName}" saved successfully`);
  };

  const handleLoadPreset = (preset: FilterPreset) => {
    setSelectedFilters(preset.filters);
    toast.success(`Loaded preset: ${preset.name}`);
  };

  const handleDeletePreset = (id: string) => {
    const updated = presets.filter((p) => p.id !== id);
    setPresets(updated);
    savePresetsToStorage(updated);
    toast.success("Preset deleted");
  };

  const handleClearFilters = () => {
    setSelectedFilters({
      status: [],
      priority: [],
      manager: [],
      dateRange: { start: "", end: "" },
      customermaf: [],
    });
  };

  const toggleFilter = (category: string, value: string) => {
    setSelectedFilters((prev) => {
      const current = (prev[category as keyof typeof prev] as string[]) || [];
      const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const activeFilterCount = Object.values(selectedFilters).reduce((count, val) => {
    if (Array.isArray(val)) return count + val.length;
    if (typeof val === "object" && val.start && val.end) return count + 1;
    return count;
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 relative">
          <Filter className="w-4 h-4 mr-2" />
          Filters
          {activeFilterCount > 0 && (
            <Badge className="ml-2 bg-blue-600 text-white text-xs">{activeFilterCount}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[700px] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Advanced Filters</DialogTitle>
          <DialogDescription>Create and save custom filter combinations</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Route Status</label>
            <div className="flex flex-wrap gap-2">
              {["pending", "in_progress", "completed", "cancelled"].map((status) => (
                <Button
                  key={status}
                  onClick={() => toggleFilter("status", status)}
                  className={`text-xs ${
                    selectedFilters.status.includes(status)
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  {status.replace("_", " ")}
                </Button>
              ))}
            </div>
          </div>

          {/* Priority Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Priority</label>
            <div className="flex flex-wrap gap-2">
              {["high", "medium", "low"].map((priority) => (
                <Button
                  key={priority}
                  onClick={() => toggleFilter("priority", priority)}
                  className={`text-xs ${
                    selectedFilters.priority.includes(priority)
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  {priority}
                </Button>
              ))}
            </div>
          </div>

          {/* Manager Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Field Managers</label>
            <div className="flex flex-wrap gap-2">
              {["Bukola", "Halleluyah", "Juwon", "Aishat"].map((manager) => (
                <Button
                  key={manager}
                  onClick={() => toggleFilter("manager", manager)}
                  className={`text-xs ${
                    selectedFilters.manager.includes(manager)
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  {manager}
                </Button>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Date Range</label>
            <div className="flex gap-2">
              <Input
                type="date"
                value={selectedFilters.dateRange.start}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, start: e.target.value },
                  }))
                }
                className="bg-slate-700 border-slate-600 text-white text-sm"
                placeholder="Start date"
              />
              <Input
                type="date"
                value={selectedFilters.dateRange.end}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    dateRange: { ...prev.dateRange, end: e.target.value },
                  }))
                }
                className="bg-slate-700 border-slate-600 text-white text-sm"
                placeholder="End date"
              />
            </div>
          </div>

          {/* Building IDs Filter */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white">Building IDs (CUSTOMERMAF)</label>
            <div className="flex flex-wrap gap-2">
              {["AFT-200", "AFT-221", "AFT-099", "DIC-087", "MOT-108", "HSY-060"].map((id) => (
                <Button
                  key={id}
                  onClick={() => toggleFilter("customermaf", id)}
                  className={`text-xs ${
                    selectedFilters.customermaf.includes(id)
                      ? "bg-purple-600 hover:bg-purple-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  {id}
                </Button>
              ))}
            </div>
          </div>

          {/* Save Preset Section */}
          <div className="border-t border-slate-700 pt-4 space-y-2">
            <label className="text-sm font-semibold text-white">Save as Preset</label>
            <div className="flex gap-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="Enter preset name (e.g., 'High Priority Routes')"
                className="bg-slate-700 border-slate-600 text-white text-sm"
              />
              <Button
                onClick={handleSavePreset}
                className="bg-green-600 hover:bg-green-700 text-white text-sm"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>

          {/* Saved Presets */}
          {presets.length > 0 && (
            <div className="border-t border-slate-700 pt-4 space-y-2">
              <label className="text-sm font-semibold text-white">Saved Presets</label>
              <div className="space-y-2">
                {presets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex items-center justify-between bg-slate-700 p-3 rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{preset.name}</p>
                      <p className="text-xs text-slate-400">
                        {Object.values(preset.filters).reduce((count, val) => {
                          if (Array.isArray(val)) return count + val.length;
                          if (typeof val === "object" && val.start && val.end) return count + 1;
                          return count;
                        }, 0)}{" "}
                        filters
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleLoadPreset(preset)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                      >
                        Load
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleDeletePreset(preset.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-slate-700 pt-4 flex gap-2">
          <Button
            onClick={handleClearFilters}
            variant="outline"
            className="flex-1 border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Clear All
          </Button>
          <Button
            onClick={() => setIsOpen(false)}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          >
            Apply Filters
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

