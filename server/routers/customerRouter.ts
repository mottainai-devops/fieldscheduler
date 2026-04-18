import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as fieldWorkerDb from '../fieldWorkerDb';

export const customerRouter = router({
  getCustomers: protectedProcedure.query(async ({ ctx }) => {
    // Admin sees all customers, field managers see only their customers
    if (ctx.user.role === 'field_manager' && ctx.user.fieldManagerId) {
      return await fieldWorkerDb.getCustomersByFieldManager(ctx.user.fieldManagerId);
    }
    return await fieldWorkerDb.getAllCustomers();
  }),
  
  getCustomerById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await fieldWorkerDb.getCustomerById(input.id);
    }),
  
  createCustomer: protectedProcedure
    .input(z.object({
      name: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      zohoContactId: z.string().optional(),
      customermaf: z.string().optional(),
      fieldManager: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      return await fieldWorkerDb.createCustomer(input);
    }),

  // ===== ADMIN: CUSTOMER VISIT NOTES =====
  getCustomerNotes: protectedProcedure
    .input(z.object({ customerId: z.number() }))
    .query(async ({ input }) => {
      const notesDb = await import('../notesDb');
      return await notesDb.getCustomerNotesWithReplies(input.customerId);
    }),

  addAdminNote: protectedProcedure
    .input(z.object({
      customerId: z.number(),
      routeId: z.number().optional().nullable(),
      noteText: z.string().optional(),
      photoUrl: z.string().optional(),
      parentNoteId: z.number().optional().nullable(),
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

  deleteCustomerNote: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const notesDb = await import('../notesDb');
      await notesDb.deleteCustomerNote(input.id);
      return { success: true };
    }),
});