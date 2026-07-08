/**
 * client/src/hooks/useExport.ts — T52 CSV export download hook
 *
 * Wraps the trpc.export.customers mutation and provides a single
 * `downloadCsv(filters)` function that:
 *   1. Calls the server-side export procedure with the current filter state
 *   2. Receives the CSV body string + filename from the server
 *   3. Creates a Blob with UTF-8 BOM (already included in body)
 *   4. Triggers a browser download via a temporary <a> element
 *   5. Cleans up the object URL after the download fires
 *
 * Usage:
 *   const { downloadCsv, isExporting } = useCustomerExport();
 *   <button disabled={isExporting} onClick={() => downloadCsv(activeFilters)}>
 *     {isExporting ? "Preparing..." : "Download CSV"}
 *   </button>
 *
 * Pattern #68 / Rule #97: This hook is the single client-side entry point for
 * all CSV downloads. T53+ modules import useExport and pass their entity name.
 */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

export interface CustomerExportFilters {
  fieldManagerId?: string;
  maf?: string;
  customerType?: string;
  routeStatus?: string;
  routingReason?: string;
  searchTerm?: string;
}

/**
 * Triggers a browser file download from a string body.
 * Creates a temporary Blob URL and simulates an anchor click.
 */
function triggerDownload(filename: string, body: string, contentType: string): void {
  const blob = new Blob([body], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  // Clean up after the browser has had a chance to initiate the download
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * Hook for downloading the customer list as a CSV file.
 * Mirrors the filter state of the Customers page exactly.
 */
export function useCustomerExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportMutation = trpc.export.customers.useMutation();

  const downloadCsv = useCallback(
    async (filters: CustomerExportFilters = {}) => {
      setIsExporting(true);
      setExportError(null);

      try {
        const result = await exportMutation.mutateAsync({
          fieldManagerId: filters.fieldManagerId ?? "",
          maf: filters.maf ?? "",
          customerType: filters.customerType ?? "",
          routeStatus: filters.routeStatus ?? "",
          routingReason: filters.routingReason ?? "",
          searchTerm: filters.searchTerm ?? "",
        });

        triggerDownload(result.filename, result.body, result.contentType);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setExportError(message);
        console.error("[useCustomerExport] Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    },
    [exportMutation]
  );

  return { downloadCsv, isExporting, exportError };
}
