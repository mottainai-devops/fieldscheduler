import { eq, desc, and, isNull } from "drizzle-orm";
import { getDb } from "./db";

export async function getCustomerNotes(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes } = await import("../drizzle/schema");
  return await db.select().from(customerVisitNotes)
    .where(and(eq(customerVisitNotes.customerId, customerId), isNull(customerVisitNotes.parentNoteId)))
    .orderBy(desc(customerVisitNotes.createdAt));
}

export async function getNoteReplies(parentNoteId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes } = await import("../drizzle/schema");
  return await db.select().from(customerVisitNotes)
    .where(eq(customerVisitNotes.parentNoteId, parentNoteId))
    .orderBy(customerVisitNotes.createdAt);
}

export async function getCustomerNotesWithReplies(customerId: number) {
  const db = await getDb();
  if (!db) return [];
  const { customerVisitNotes } = await import("../drizzle/schema");
  const notes = await db.select().from(customerVisitNotes)
    .where(eq(customerVisitNotes.customerId, customerId))
    .orderBy(customerVisitNotes.createdAt);
  
  // Build thread structure
  const noteMap = new Map<number, any>();
  const rootNotes: any[] = [];
  
  for (const note of notes) {
    noteMap.set(note.id, { ...note, replies: [] });
  }
  for (const note of notes) {
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
  const result = await db.insert(customerVisitNotes).values({
    customerId: data.customerId,
    routeId: data.routeId ?? null,
    workerId: data.workerId ?? null,
    authorType: data.authorType,
    authorName: data.authorName ?? null,
    noteText: data.noteText ?? null,
    photoUrl: data.photoUrl ?? null,
    visitDate: data.visitDate ?? new Date().toISOString().split('T')[0],
    parentNoteId: data.parentNoteId ?? null,
  });
  return result;
}

export async function deleteCustomerNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { customerVisitNotes } = await import("../drizzle/schema");
  await db.delete(customerVisitNotes).where(eq(customerVisitNotes.id, id));
}
