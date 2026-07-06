import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function ExportAnalytics() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv");

  // Queries for analytics data
  const { data: allTags = {}, isLoading: tagsLoading } = trpc.fieldWorker.getAllFieldManagerTags.useQuery();
  const { data: allCustomers = [], isLoading: customersLoading } = trpc.fieldWorker.getCustomers.useQuery();
  const { data: routes = [], isLoading: routesLoading } = trpc.fieldWorker.getRoutes.useQuery();
  const { data: workers = [], isLoading: workersLoading } = trpc.fieldWorker.getWorkers.useQuery();

  // Calculate statistics
  const totalTags = Object.values(allTags).reduce((sum: number, tags: any) => sum + (Array.isArray(tags) ? tags.length : 0), 0);
  const totalManagers = Object.keys(allTags).length;
  const activeRoutes = routes.filter((r) => r.status === "in_progress").length;
  const completedRoutes = routes.filter((r) => r.status === "completed").length;
  const pendingRoutes = routes.filter((r) => r.status === "pending").length;
  const taggedCustomers = allCustomers.filter((c) => c.maf).length;

  const isLoading = tagsLoading || customersLoading || routesLoading || workersLoading;

  const generateCSV = () => {
    const headers = ["Metric", "Value"];
    const data = [
      ["Total Field Managers", totalManagers.toString()],
      ["Total Tags (Building IDs)", totalTags.toString()],
      ["Total Customers", allCustomers.length.toString()],
      ["Tagged Customers", taggedCustomers.toString()],
      ["Active Routes", activeRoutes.toString()],
      ["Pending Routes", pendingRoutes.toString()],
      ["Completed Routes", completedRoutes.toString()],
      ["Total Routes", routes.length.toString()],
      ["Export Date", new Date().toISOString()],
    ];

    // Add field manager breakdown
    data.push(["", ""]);
    data.push(["Field Manager Breakdown", ""]);
    workers.forEach((worker) => {
      const managerTags = (allTags[worker.id] || []) as any[];
      data.push([worker.name || `Manager ${worker.id}`, managerTags.length.toString()]);
    });

    // Add route status breakdown
    data.push(["", ""]);
    data.push(["Route Status Breakdown", ""]);
    const statusCounts: Record<string, number> = {};
    routes.forEach((route) => {
      statusCounts[route.status || "unknown"] = (statusCounts[route.status || "unknown"] || 0) + 1;
    });
    Object.entries(statusCounts).forEach(([status, count]) => {
      data.push([`Routes - ${status}`, count.toString()]);
    });

    const csv = [headers, ...data].map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    return csv;
  };

  const generateJSON = () => {
    return JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        summary: {
          totalFieldManagers: totalManagers,
          totalTags: totalTags,
          totalCustomers: allCustomers.length,
          taggedCustomers: taggedCustomers,
          totalRoutes: routes.length,
          routesByStatus: {
            active: activeRoutes,
            pending: pendingRoutes,
            completed: completedRoutes,
          },
        },
        fieldManagerBreakdown: workers.map((worker) => ({
          id: worker.id,
          name: worker.name,
          tagsAssigned: (allTags[worker.id] || []).length,
        })),
        routeStatusBreakdown: routes.reduce(
          (acc, route) => {
            const status = route.status || "unknown";
            if (!acc[status]) acc[status] = 0;
            acc[status]++;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
      null,
      2
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let content = "";
      let filename = "";
      let mimeType = "";

      if (exportFormat === "csv") {
        content = generateCSV();
        filename = `field-manager-analytics-${new Date().toISOString().split("T")[0]}.csv`;
        mimeType = "text/csv";
      } else {
        content = generateJSON();
        filename = `field-manager-analytics-${new Date().toISOString().split("T")[0]}.json`;
        mimeType = "application/json";
      }

      // Create blob and download
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success(`Analytics exported as ${exportFormat.toUpperCase()}`);
    } catch (error) {
      toast.error("Failed to export analytics");
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Export Analytics</DialogTitle>
          <DialogDescription>Download Field Manager statistics and metrics</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Statistics Preview */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Statistics to Export</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-xs text-slate-400">Field Managers</p>
                  <p className="text-lg font-bold text-white">{totalManagers}</p>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-xs text-slate-400">Building IDs</p>
                  <p className="text-lg font-bold text-blue-400">{totalTags}</p>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-xs text-slate-400">Total Routes</p>
                  <p className="text-lg font-bold text-green-400">{routes.length}</p>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <p className="text-xs text-slate-400">Tagged Customers</p>
                  <p className="text-lg font-bold text-purple-400">{taggedCustomers}</p>
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white">Export Format</h3>
              <div className="flex gap-2">
                <Button
                  onClick={() => setExportFormat("csv")}
                  className={`flex-1 ${
                    exportFormat === "csv"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  CSV
                </Button>
                <Button
                  onClick={() => setExportFormat("json")}
                  className={`flex-1 ${
                    exportFormat === "json"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-700 hover:bg-slate-600 text-slate-300"
                  }`}
                >
                  <FileJson className="w-4 h-4 mr-2" />
                  JSON
                </Button>
              </div>
            </div>

            {/* Export Button */}
            <Button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Download {exportFormat.toUpperCase()}
                </>
              )}
            </Button>

            <p className="text-xs text-slate-500 text-center">
              Includes summary, field manager breakdown, and route status metrics
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

