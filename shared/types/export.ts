/**
 * shared/types/export.ts — T52 shared CSV export types
 *
 * These types are consumed by:
 *   - server/routers/exportRouter.ts (procedure definitions)
 *   - server/utils/csvExport.ts (serialization)
 *   - client/src/hooks/useExport.ts (download trigger)
 *
 * Rule #97 candidate: Cross-cutting features get shared abstractions on first
 * request. The ExportColumn + ExportRequest contract lives here so every
 * module (Customers, Invoices, Payments, Routes) registers its columns once
 * and the serialization/download path is shared.
 */

/**
 * Defines a single column in a CSV export.
 * `key` maps to a property on the row data object.
 * `transform` is optional — if omitted, the value is coerced to string.
 */
export interface ExportColumn {
  /** Property name on the row data object */
  key: string;
  /** Header text in the CSV */
  header: string;
  /**
   * Optional transform applied to the raw value before CSV serialization.
   * Receives the raw cell value and the full row for cross-field transforms.
   * Must return a string (already unescaped — escapeCsv handles quoting).
   */
  transform?: (value: unknown, row: Record<string, unknown>) => string;
}

/**
 * Payload sent from client to the export procedure.
 * `entity` selects the registered column set and query.
 * `filters` is the current filter state from the list view.
 */
export interface ExportRequest {
  /** Entity name: "customers", "invoices", "payments", "routes", etc. */
  entity: string;
  /** Active filter values — inactive filters should be omitted or set to null/"" */
  filters: Record<string, unknown>;
  /** Format — only "csv" for T52; extensible for future xlsx/json */
  format: 'csv';
}

/**
 * Response returned by the export procedure.
 * The client uses `body` to construct a Blob and trigger a browser download.
 */
export interface ExportResponse {
  /** Suggested download filename, e.g. "customers_manager-Bukola_2026-07-08.csv" */
  filename: string;
  /** MIME type for the Blob */
  contentType: string;
  /** Full CSV string (UTF-8 BOM prepended for Excel compatibility) */
  body: string;
}
