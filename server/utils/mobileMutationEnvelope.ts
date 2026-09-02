/**
 * Normalizes MySQL/Drizzle insert results before they cross the mobile API boundary.
 * mysql2 may return either a ResultSetHeader or a tuple whose first element is one.
 */
export function getInsertedId(result: unknown, resource: string): number {
  const header = Array.isArray(result) ? result[0] : result;
  const insertId = (header as { insertId?: unknown } | null)?.insertId;
  if (typeof insertId !== "number" || !Number.isInteger(insertId) || insertId <= 0) {
    throw new Error(`Unable to determine inserted ${resource} identifier`);
  }
  return insertId;
}
