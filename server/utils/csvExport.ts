/**
 * server/utils/csvExport.ts — T52 shared CSV serialization utility
 *
 * RFC 4180 compliance:
 *   - Fields containing commas, double-quotes, or newlines are enclosed in
 *     double-quotes.
 *   - Double-quote characters within fields are escaped as "".
 *   - UTF-8 BOM (\uFEFF) prepended so Excel opens Naira (₦) and other
 *     non-ASCII characters correctly without manual encoding selection.
 *   - CRLF line endings per RFC 4180 (Windows Excel compatibility).
 *
 * Memory model:
 *   - buildCsvString() buffers the full CSV in memory.
 *   - 7,941 customers × ~200 bytes/row ≈ 1.6 MB — well within Node.js limits.
 *   - For T53+ (32,950 invoices ≈ 6.5 MB), the same function still fits; if
 *     tRPC response limits become an issue, switch to a direct Express
 *     streaming endpoint.
 */

import type { ExportColumn } from '../../shared/types/export';

/**
 * Escapes a single CSV field value per RFC 4180.
 * Exported for direct use in tests.
 */
export function escapeCsv(value: string): string {
  // Must quote if field contains comma, double-quote, CR, or LF
  if (
    value.includes(',') ||
    value.includes('"') ||
    value.includes('\n') ||
    value.includes('\r')
  ) {
    return '"' + value.replace(/"/g, '""') + '"';
  }
  return value;
}

/**
 * Serializes an array of row objects to a complete CSV string.
 *
 * @param rows   Array of plain objects (e.g. Drizzle rows + computed fields)
 * @param columns Column definitions controlling which fields appear and in what order
 * @returns Full CSV string with UTF-8 BOM, header row, and one row per record.
 *          Returns BOM + header only (no data rows) if `rows` is empty.
 */
export function buildCsvString(
  rows: Record<string, unknown>[],
  columns: ExportColumn[]
): string {
  const BOM = '\uFEFF';
  const CRLF = '\r\n';

  // Header row
  const header = columns.map(c => escapeCsv(c.header)).join(',');

  if (rows.length === 0) {
    return BOM + header + CRLF;
  }

  // Data rows
  const dataRows = rows.map(row => {
    return columns
      .map(col => {
        const rawValue = row[col.key];
        const strValue = col.transform
          ? col.transform(rawValue, row)
          : rawValue == null
            ? ''
            : String(rawValue);
        return escapeCsv(strValue);
      })
      .join(',');
  });

  return BOM + header + CRLF + dataRows.join(CRLF) + CRLF;
}
