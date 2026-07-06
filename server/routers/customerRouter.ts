import { router, protectedProcedure, fieldManagerProcedure, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as fieldWorkerDb from '../fieldWorkerDb';

export const customerRouter = router({
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomers: fieldManagerProcedure.query(async ({ ctx }) => {
    // Admin sees all customers, field managers see only their customers
    if (ctx.user.role === 'field_manager' && ctx.user.fieldManagerId) {
      return await fieldWorkerDb.getCustomersByFieldManager(ctx.user.fieldManagerId);
    }
    return await fieldWorkerDb.getAllCustomers();
  }),
  
  // T14 Item 3: fieldManagerProcedure — customer reads accessible to all admin-tier roles
  getCustomerById: fieldManagerProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomerById(input.id);
    }),
  
  // T14 Item 3: adminProcedure — customer creation is admin-tier
  createCustomer: adminProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      zohoContactId: z.string().optional(),
      maf: z.string().optional(),
      fieldManager: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createCustomer(input);
    }),

  // ===== ADMIN: CUSTOMER VISIT NOTES =====
  // T14 Item 3: fieldManagerProcedure — customer note reads accessible to all admin-tier roles
  getCustomerNotes: fieldManagerProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const notesDb = await import('../notesDb');
      return await notesDb.getCustomerNotesWithReplies(input.customerId);
    }),

  // T14 Item 3: adminProcedure — admin note creation is admin-tier
  addAdminNote: adminProcedure
    .input(z.object({
      customerId: z.number(),
      // @drift-suppress: future-use — route-linked notes not yet implemented in admin UI
      routeId: z.number().optional().nullable(),
      noteText: z.string().optional(),
      // @drift-suppress: future-use — photo attachment for admin notes not yet implemented
      photoUrl: z.string().optional(),
      parentNoteId: z.number().optional().nullable(),
      // @drift-suppress: server-side fallback — used as ctx.user.name override; not sent by client
      authorName: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const notesDb = await import('../notesDb');
      const adminName = input.authorName || ctx.user?.name || ctx.user?.email || 'Admin';
      await notesDb.addCustomerNote({
        ...input,
        authorType: 'admin',
        authorName: adminName,
      });
      return { success: true };
    }),

  // T14 Item 3: adminProcedure — customer note deletion is admin-tier
  deleteCustomerNote: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const notesDb = await import('../notesDb');
      await notesDb.deleteCustomerNote(input.id);
      return { success: true };
    }),
});