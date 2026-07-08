/**
 * server/utils/exportFilename.ts — T52 export filename generation
 *
 * Pattern:
 *   {entity}_{filter1-value1}_{filter2-value2}_{YYYY-MM-DD}.{format}
 *
 * Examples:
 *   customers_all_2026-07-08.csv
 *   customers_manager-Bukola_maf-AFT-221_2026-07-08.csv
 *   invoices_fm-Halleluyah_daterange-2024-01-01-to-2024-12-31_2026-07-08.csv
 *
 * Rules:
 *   - Inactive filters (null, undefined, "", "all") are omitted.
 *   - Each filter part is sanitized: spaces→underscore, /\→dash,
 *     non-alphanumeric/underscore/dash stripped, capped at 50 chars.
 *   - Total filename (before extension) capped at 200 chars; filter parts
 *     are truncated gracefully if the base would exceed the cap.
 *   - Date is always the UTC date of generation (ISO 8601 slice).
 */

const FILTER_PART_MAX = 50;
const FILENAME_MAX = 200;

/**
 * Sanitizes a single filter key-value segment.
 * Exported for direct use in tests.
 */
export function sanitizeFilterPart(s: string): string {
  return String(s)
    .replace(/\s+/g, '_')
    .replace(/[/\\]/g, '-')
    .replace(/[^a-zA-Z0-9_\-]/g, '')
    .slice(0, FILTER_PART_MAX);
}

/**
 * Generates a download filename from entity name, active filters, and format.
 *
 * @param entity   Entity name, e.g. "customers"
 * @param filters  Active filter state — inactive values should be null/""/undefined/"all"
 * @param format   File extension without dot, defaults to "csv"
 * @param now      Optional date override for testing (defaults to new Date())
 */
export function generateExportFilename(
  entity: string,
  filters: Record<string, unknown>,
  format: string = 'csv',
  now: Date = new Date()
): string {
  const date = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Collect active filter parts
  const filterParts = Object.entries(filters)
    .filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (value === '' || value === 'all') return false;
      return true;
    })
    .map(([key, value]) => sanitizeFilterPart(`${key}-${value}`))
    .filter(part => part.length > 0);

  // Build base (without extension)
  const entitySanitized = sanitizeFilterPart(entity);
  let base: string;

  if (filterParts.length === 0) {
    base = `${entitySanitized}_all_${date}`;
  } else {
    // Build incrementally, truncating if we'd exceed FILENAME_MAX
    const prefix = `${entitySanitized}_`;
    const suffix = `_${date}`;
    const budget = FILENAME_MAX - prefix.length - suffix.length;

    let parts = '';
    for (const part of filterParts) {
      const candidate = parts.length === 0 ? part : `${parts}_${part}`;
      if (candidate.length <= budget) {
        parts = candidate;
      } else {
        // Truncate this part to fit remaining budget
        const remaining = budget - (parts.length === 0 ? 0 : parts.length + 1);
        if (remaining > 0) {
          parts = parts.length === 0
            ? part.slice(0, remaining)
            : `${parts}_${part.slice(0, remaining)}`;
        }
        break;
      }
    }

    base = `${prefix}${parts}${suffix}`;
  }

  // Final safety cap
  const truncated = base.length > FILENAME_MAX ? base.slice(0, FILENAME_MAX) : base;

  return `${truncated}.${format}`;
}
