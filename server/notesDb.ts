import { eq, desc, and, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { evidenceKeyFromReference, storageGet } from "./storage";

async function hydrateNotePhoto<T extends { photoStorageKey: string | null; photoUrl: string | null }>(note: T) {
  if (!note.photoStorageKey) return note;
  try {
    const { url } = await storageGet(note.photoStorageKey);
    const { photoStorageKey: _photoStorageKey, ...safeNote } = note;
    return { ...safeNote, photoUrl: url };
  } catch {
    const { photoStorageKey: _photoStorageKey, ...safeNote } = note;
    return { ...safeNote, photoUrl: null };
  }
}

export async function getCustomerNotes(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes } = await import("../drizzle/schema");
  const notes = await db.select().from(customerVisitNotes)
    .where(and(eq(customerVisitNotes.customerId, customerId), isNull(customerVisitNotes.parentNoteId)))
    .orderBy(desc(customerVisitNotes.createdAt));
  return await Promise.all(notes.map(hydrateNotePhoto));
}

export async function getNoteReplies(parentNoteId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes } = await import("../drizzle/schema");
  const notes = await db.select().from(customerVisitNotes)
    .where(eq(customerVisitNotes.parentNoteId, parentNoteId))
    .orderBy(customerVisitNotes.createdAt);
  return await Promise.all(notes.map(hydrateNotePhoto));
}

export async function getCustomerNotesWithReplies(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes } = await import("../drizzle/schema");
  const notes = await db.select().from(customerVisitNotes)
    .where(eq(customerVisitNotes.customerId, customerId))
    .orderBy(customerVisitNotes.createdAt);
  const hydratedNotes = await Promise.all(notes.map(hydrateNotePhoto));
  
  // Build thread structure
  const noteMap = new Map<number, any>();
  const rootNotes: any[] = [];
  
  for (const note of hydratedNotes) {
    noteMap.set(note.id, { ...note, replies: [] });
  }
  for (const note of hydratedNotes) {
    if (note.parentNoteId && noteMap.has(note.parentNoteId)) {
      noteMap.get(note.parentNoteId).replies.push(noteMap.get(note.id));
    } else if (!note.parentNoteId) {
      rootNotes.push(noteMap.get(note.id));
    }
  }
  return rootNotes.reverse(); // newest first
}

export async function addCustomerNote(data: {
  customerId: number;
  routeId?: number | null;
  workerId?: number | null;
  authorType: 'worker' | 'admin';
  authorName?: string;
  noteText?: string;
  photoUrl?: string;
  visitDate?: string;
  parentNoteId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerVisitNotes } = await import("../drizzle/schema");
  const photoStorageKey = evidenceKeyFromReference(data.photoUrl);
  if (data.photoUrl && !photoStorageKey) {
    throw new Error("Invalid evidence reference");
  }
  const result = await db.insert(customerVisitNotes).values({
    customerId: data.customerId,
    routeId: data.routeId ?? null,
    workerId: data.workerId ?? null,
    authorType: data.authorType,
    authorName: data.authorName ?? null,
    noteText: data.noteText ?? null,
    photoUrl: null,
    photoStorageKey,
    visitDate: data.visitDate ?? new Date().toISOString().split('T')[0],
    parentNoteId: data.parentNoteId ?? null,
  });
  return result;
}

export async function getCustomerNoteById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { customerVisitNotes } = await import("../drizzle/schema");
  const rows = await db.select().from(customerVisitNotes).where(eq(customerVisitNotes.id, id)).limit(1);
  return rows[0] ? await hydrateNotePhoto(rows[0]) : null;
}

export async function deleteCustomerNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerVisitNotes } = await import("../drizzle/schema");
  await db.delete(customerVisitNotes).where(eq(customerVisitNotes.id, id));
}
