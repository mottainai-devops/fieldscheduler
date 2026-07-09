/**
 * client/src/hooks/useExport.ts — T52/T54 CSV export download hooks
 *
 * Wraps tRPC export mutations and provides `downloadCsv(filters)` functions that:
 *   1. Call the server-side export procedure with the current filter state
 *   2. Receive the CSV body string + filename from the server
 *   3. Create a Blob with UTF-8 BOM (already included in body)
 *   4. Trigger a browser download via a temporary <a> element
 *   5. Clean up the object URL after the download fires
 *
 * Exports:
 *   useCustomerExport()         — T52: Customers page
 *   useFinancialInvoicesExport() — T54: Financial Dashboard (all invoices, batched)
 *   useRecentInvoicesExport()   — T54: Financial Dashboard (recent invoices, filtered)
 *   usePaymentsExport()         — T54: Financial Dashboard (payments, filtered)
 *
 * Pattern #68 / Rule #97: This hook is the single client-side entry point for
 * all CSV downloads. Add new export hooks here as new entities are added.
 */

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";

// ─── Shared types ──────────────────────────────────────────────────────────

export interface CustomerExportFilters {
  fieldManagerId?: string;
  maf?: string;
  customerType?: string;
  routeStatus?: string;
  routingReason?: string;
  searchTerm?: string;
}

export interface FinancialExportFilters {
  startDate?: string;
  endDate?: string;
  fieldManagerId?: string;
  maf?: string;
  allTime?: boolean;
}

// ─── Shared download utility ───────────────────────────────────────────────

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

// ─── T52: Customer export ──────────────────────────────────────────────────

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

// ─── T54: Financial invoices export (all invoices, batched) ───────────────

/**
 * Hook for downloading all invoices matching the current Financial Dashboard
 * filters as a CSV file. Uses the batched fetchInvoicesForExport query which
 * pages through the full dataset server-side.
 *
 * Usage:
 *   const { downloadCsv, isExporting } = useFinancialInvoicesExport();
 *   <button disabled={isExporting} onClick={() => downloadCsv({ startDate, endDate, fieldManagerId, maf, allTime })}>
 *     {isExporting ? "Preparing..." : "Download All Invoices CSV"}
 *   </button>
 */
export function useFinancialInvoicesExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportMutation = trpc.export.financialInvoices.useMutation();

  const downloadCsv = useCallback(
    async (filters: FinancialExportFilters = {}) => {
      setIsExporting(true);
      setExportError(null);

      try {
        const result = await exportMutation.mutateAsync({
          startDate: filters.startDate,
          endDate: filters.endDate,
          fieldManagerId: filters.fieldManagerId,
          maf: filters.maf,
          allTime: filters.allTime ?? false,
        });

        triggerDownload(result.filename, result.body, result.contentType);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setExportError(message);
        console.error("[useFinancialInvoicesExport] Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    },
    [exportMutation]
  );

  return { downloadCsv, isExporting, exportError };
}

// ─── T54: Recent invoices export (filtered, no batching) ──────────────────

/**
 * Hook for downloading the recent invoices list (as shown in the Financial
 * Dashboard Recent Invoices table) as a CSV file. Applies the same date/FM/MAF
 * filters as the displayed table.
 */
export function useRecentInvoicesExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportMutation = trpc.export.recentInvoices.useMutation();

  const downloadCsv = useCallback(
    async (filters: FinancialExportFilters = {}) => {
      setIsExporting(true);
      setExportError(null);

      try {
        const result = await exportMutation.mutateAsync({
          startDate: filters.startDate,
          endDate: filters.endDate,
          fieldManagerId: filters.fieldManagerId,
          maf: filters.maf,
          allTime: filters.allTime ?? false,
        });

        triggerDownload(result.filename, result.body, result.contentType);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setExportError(message);
        console.error("[useRecentInvoicesExport] Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    },
    [exportMutation]
  );

  return { downloadCsv, isExporting, exportError };
}

// ─── T54: Payments export ──────────────────────────────────────────────────

/**
 * Hook for downloading the payments list (as shown in the Financial Dashboard
 * Recent Payments table) as a CSV file. Applies the same date/FM/MAF filters
 * as the displayed table.
 */
export function usePaymentsExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const exportMutation = trpc.export.payments.useMutation();

  const downloadCsv = useCallback(
    async (filters: FinancialExportFilters = {}) => {
      setIsExporting(true);
      setExportError(null);

      try {
        const result = await exportMutation.mutateAsync({
          startDate: filters.startDate,
          endDate: filters.endDate,
          fieldManagerId: filters.fieldManagerId,
          maf: filters.maf,
          allTime: filters.allTime ?? false,
        });

        triggerDownload(result.filename, result.body, result.contentType);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Export failed";
        setExportError(message);
        console.error("[usePaymentsExport] Export failed:", err);
      } finally {
        setIsExporting(false);
      }
    },
    [exportMutation]
  );

  return { downloadCsv, isExporting, exportError };
}
