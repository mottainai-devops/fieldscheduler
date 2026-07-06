import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { fieldManagerTags, FieldManagerTag, InsertFieldManagerTag } from "../drizzle/schema";

/**
 * Get all tags for a specific field manager
 */
export async function getFieldManagerTags(fieldManagerId: number): Promise<FieldManagerTag[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    return await db
      .select()
      .from(fieldManagerTags)
      .where(eq(fieldManagerTags.fieldManagerId, fieldManagerId));
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get tags:", error);
    return [];
  }
}

/**
 * Get all tags grouped by field manager
 */
export async function getAllFieldManagerTags(): Promise<Record<number, FieldManagerTag[]>> {
  const db = await getDb();
  if (!db) return {};

  try {
    const allTags = await db.select().from(fieldManagerTags);
    const grouped: Record<number, FieldManagerTag[]> = {};
    
    allTags.forEach((tag) => {
      if (!grouped[tag.fieldManagerId]) {
        grouped[tag.fieldManagerId] = [];
      }
      grouped[tag.fieldManagerId].push(tag);
    });
    
    return grouped;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get all tags:", error);
    return {};
  }
}

/**
 * Add a new tag (CUSTOMERMAF) to a field manager
 */
export async function addFieldManagerTag(
  fieldManagerId: number,
  customermaf: string,
  description?: string
): Promise<FieldManagerTag | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if tag already exists
    const existing = await db
      .select()
      .from(fieldManagerTags)
      .where(
        and(
          eq(fieldManagerTags.fieldManagerId, fieldManagerId),
          eq(fieldManagerTags.customermaf, customermaf)
        )
      );

    if (existing.length > 0) {
      return existing[0];
    }

    // Insert new tag
    const result = await db.insert(fieldManagerTags).values({
      fieldManagerId,
      customermaf,
      description,
    });

    // Fetch and return the created tag
    const created = await db
      .select()
      .from(fieldManagerTags)
      .where(
        and(
          eq(fieldManagerTags.fieldManagerId, fieldManagerId),
          eq(fieldManagerTags.customermaf, customermaf)
        )
      );

    return created[0] || null;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to add tag:", error);
    return null;
  }
}

/**
 * Remove a tag from a field manager
 */
export async function removeFieldManagerTag(
  fieldManagerId: number,
  customermaf: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    const result = await db
      .delete(fieldManagerTags)
      .where(
        and(
          eq(fieldManagerTags.fieldManagerId, fieldManagerId),
          eq(fieldManagerTags.customermaf, customermaf)
        )
      );

    return true;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to remove tag:", error);
    return false;
  }
}

/**
 * Update tag description
 */
export async function updateFieldManagerTagDescription(
  fieldManagerId: number,
  customermaf: string,
  description: string
): Promise<FieldManagerTag | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    await db
      .update(fieldManagerTags)
      .set({ description })
      .where(
        and(
          eq(fieldManagerTags.fieldManagerId, fieldManagerId),
          eq(fieldManagerTags.customermaf, customermaf)
        )
      );

    const updated = await db
      .select()
      .from(fieldManagerTags)
      .where(
        and(
          eq(fieldManagerTags.fieldManagerId, fieldManagerId),
          eq(fieldManagerTags.customermaf, customermaf)
        )
      );

    return updated[0] || null;
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to update tag:", error);
    return null;
  }
}

/**
 * Get customers for a specific CUSTOMERMAF tag
 */
export async function getCustomersForTag(customermaf: string) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { customers } = await import("../drizzle/schema");
    return await db
      .select()
      .from(customers)
      .where(eq(customers.maf, customermaf));
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get customers for tag:", error);
    return [];
  }
}

/**
 * Get all customers for a field manager (across all their tags)
 */
export async function getCustomersForFieldManager(fieldManagerId: number) {
  const db = await getDb();
  if (!db) return [];

  try {
    const { customers } = await import("../drizzle/schema");
    const tags = await getFieldManagerTags(fieldManagerId);
    const customermafCodes = tags.map((t) => t.customermaf);

    if (customermafCodes.length === 0) return [];

    return await db
      .select()
      .from(customers)
      .where(
        customermafCodes.length === 1
          ? eq(customers.maf, customermafCodes[0])
          : undefined
      );
  } catch (error) {
    console.error("[FieldManagerTagDb] Failed to get customers for field manager:", error);
    return [];
  }
}

/**
 * Bulk add tags for a field manager
 */
export async function bulkAddFieldManagerTags(
  fieldManagerId: number,
  tags: Array<{ customermaf: string; description?: string }>
): Promise<FieldManagerTag[]> {
  const results: FieldManagerTag[] = [];

  for (const tag of tags) {
    const result = await addFieldManagerTag(fieldManagerId, tag.customermaf, tag.description);
    if (result) {
      results.push(result);
    }
  }

  return results;
}

