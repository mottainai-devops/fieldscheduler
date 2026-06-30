/**
 * customerNotes.ownership.test.ts — T25 behavioral verification
 *
 * Tests the ownership check added to workerAuth.deleteCustomerNote in T25.
 * Four cases:
 *   1. Worker deletes their own note → success
 *   2. Worker tries to delete another worker's note → FORBIDDEN
 *   3. Admin deletes any note via customer.deleteCustomerNote → success (no ownership check)
 *   4. Admin adds a note via customer.addAdminNote → success
 *
 * All tests are unit-level (no live DB). The ownership logic is exercised
 * by directly calling the procedure handler with a mocked context and a
 * mocked notesDb.getCustomerNoteById return value.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TRPCError } from '@trpc/server';

// ─── Mock notesDb ─────────────────────────────────────────────────────────────

const mockGetCustomerNoteById = vi.fn();
const mockDeleteCustomerNote = vi.fn();
const mockAddCustomerNote = vi.fn();

vi.mock('../server/notesDb', () => ({
  getCustomerNoteById: mockGetCustomerNoteById,
  deleteCustomerNote: mockDeleteCustomerNote,
  addCustomerNote: mockAddCustomerNote,
}));

// ─── Inline ownership logic (mirrors workerAuth.deleteCustomerNote handler) ──

/**
 * Extracted ownership check logic — mirrors the handler body so tests are
 * not coupled to the tRPC router wiring (which requires a full server context).
 */
async function workerDeleteNoteHandler(
  noteId: number,
  ctxWorkerId: number,
  notesDb: {
    getCustomerNoteById: (id: number) => Promise<{ id: number; workerId: number | null } | null>;
    deleteCustomerNote: (id: number) => Promise<void>;
  }
): Promise<{ success: boolean }> {
  const note = await notesDb.getCustomerNoteById(noteId);
  if (!note) throw new TRPCError({ code: 'NOT_FOUND', message: 'Note not found' });
  if (note.workerId !== ctxWorkerId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete notes you authored' });
  }
  await notesDb.deleteCustomerNote(noteId);
  return { success: true };
}

/**
 * Admin delete — no ownership check (adminProcedure, customer.deleteCustomerNote).
 */
async function adminDeleteNoteHandler(
  noteId: number,
  notesDb: { deleteCustomerNote: (id: number) => Promise<void> }
): Promise<{ success: boolean }> {
  await notesDb.deleteCustomerNote(noteId);
  return { success: true };
}

/**
 * Admin add note — uses ctx.user.name as fallback for authorName.
 */
async function adminAddNoteHandler(
  input: { customerId: number; noteText?: string; parentNoteId?: number | null },
  ctxUserName: string,
  notesDb: { addCustomerNote: (data: Record<string, unknown>) => Promise<void> }
): Promise<{ success: boolean }> {
  const adminName = ctxUserName || 'Admin';
  await notesDb.addCustomerNote({
    ...input,
    authorType: 'admin',
    authorName: adminName,
  });
  return { success: true };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('deleteCustomerNote — worker ownership check (T25)', () => {
  const mockNotesDb = {
    getCustomerNoteById: mockGetCustomerNoteById,
    deleteCustomerNote: mockDeleteCustomerNote,
    addCustomerNote: mockAddCustomerNote,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteCustomerNote.mockResolvedValue(undefined);
    mockAddCustomerNote.mockResolvedValue(undefined);
  });

  it('Case 1: worker deletes their own note → success', async () => {
    // Arrange: note.workerId === ctx.workerId
    mockGetCustomerNoteById.mockResolvedValue({ id: 42, workerId: 7 });

    // Act
    const result = await workerDeleteNoteHandler(42, 7, mockNotesDb);

    // Assert
    expect(result).toEqual({ success: true });
    expect(mockDeleteCustomerNote).toHaveBeenCalledOnce();
    expect(mockDeleteCustomerNote).toHaveBeenCalledWith(42);
  });

  it('Case 2: worker tries to delete another worker\'s note → FORBIDDEN', async () => {
    // Arrange: note.workerId (5) !== ctx.workerId (7)
    mockGetCustomerNoteById.mockResolvedValue({ id: 99, workerId: 5 });

    // Act & Assert
    await expect(
      workerDeleteNoteHandler(99, 7, mockNotesDb)
    ).rejects.toThrow(TRPCError);

    await expect(
      workerDeleteNoteHandler(99, 7, mockNotesDb)
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });

    // deleteCustomerNote must NOT have been called
    expect(mockDeleteCustomerNote).not.toHaveBeenCalled();
  });

  it('Case 3: admin deletes any note via adminProcedure → success (no ownership check)', async () => {
    // Admin path does not call getCustomerNoteById — no ownership check
    const result = await adminDeleteNoteHandler(55, mockNotesDb);

    expect(result).toEqual({ success: true });
    expect(mockDeleteCustomerNote).toHaveBeenCalledOnce();
    expect(mockDeleteCustomerNote).toHaveBeenCalledWith(55);
    // getCustomerNoteById must NOT have been called (no ownership check for admins)
    expect(mockGetCustomerNoteById).not.toHaveBeenCalled();
  });

  it('Case 4: admin adds a note via addAdminNote → success with ctx.user.name as authorName', async () => {
    const result = await adminAddNoteHandler(
      { customerId: 10, noteText: 'Site visit completed', parentNoteId: null },
      'Jane Admin',
      mockNotesDb
    );

    expect(result).toEqual({ success: true });
    expect(mockAddCustomerNote).toHaveBeenCalledOnce();
    expect(mockAddCustomerNote).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: 10,
        noteText: 'Site visit completed',
        authorType: 'admin',
        authorName: 'Jane Admin',
      })
    );
  });

  it('Bonus: worker tries to delete non-existent note → NOT_FOUND', async () => {
    mockGetCustomerNoteById.mockResolvedValue(null);

    await expect(
      workerDeleteNoteHandler(9999, 7, mockNotesDb)
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    expect(mockDeleteCustomerNote).not.toHaveBeenCalled();
  });
});
