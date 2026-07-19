/**
 * Shared MAF utility — Rule #99
 *
 * Imported by:
 *   - server/fieldWorkerDb.ts  (upsertCustomerFromZoho)
 *   - server/contactSync.t60maf.test.ts
 *
 * A MAF value is the canonical building identifier used throughout the system,
 * e.g. "ADK-062", "TKB-117", "EOA-414".
 * Format: 2–4 uppercase letters, hyphen, exactly 3 digits.
 */

/**
 * Returns `buildingId` unchanged if it matches the canonical MAF format
 * (e.g. "ADK-062").  Returns `null` for null/undefined/empty/non-canonical
 * input (ArcGIS composite strings, numeric-only, etc.).
 */
export function extractMafFromBuildingId(
  buildingId: string | null | undefined
): string | null {
  if (!buildingId) return null;
  const trimmed = buildingId.trim();
  if (/^[A-Z]{2,}-\d{3}$/.test(trimmed)) return trimmed;
  return null;
}
