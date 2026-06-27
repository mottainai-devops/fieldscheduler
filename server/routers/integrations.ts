import { protectedProcedure, fieldManagerProcedure, adminProcedure, superadminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import * as zoho from "../services/zoho";
import * as scheduler from "../services/zohoScheduler";

export const integrationsRouter = router({
  // Get Zoho authorization status
  // T14 Item 3: adminProcedure — Zoho integration status is admin-tier
  getZohoStatus: adminProcedure.query(async () => {
    try {
      const status = zoho.getOAuthStatus();
      return {
        hasRefreshToken: !!status.hasRefreshToken,
        isAuthorized: status.isAuthorized,
      };
    } catch (error: any) {
      return {
        hasRefreshToken: false,
        isAuthorized: false,
        error: error.message,
      };
    }
  }),

  // Sync Zoho contacts to database
  // T14 Item 3: superadminProcedure — Zoho sync is a high-impact operation, superadmin only
  syncZohoContacts: superadminProcedure.mutation(async () => {
    try {
      console.log('[Integrations] Starting Zoho sync...');
      const result = await zoho.syncZohoContacts();
      console.log('[Integrations] Sync result:', JSON.stringify(result, null, 2));
      return { 
        success: result.success, 
        synced: result.synced, 
        errors: result.errors,
        fieldManagerCount: result.fieldManagerCount,
        customermafCount: result.customermafCount,
        contacts: result.contacts 
      };
    } catch (error: any) {
      console.error('[Integrations] Sync error:', error);
      return { 
        success: false, 
        synced: 0, 
        errors: 1,
        fieldManagerCount: 0,
        customermafCount: 0,
        error: error.message 
      };
    }
  }),

  // Get customer statement
  // T14 Item 3: fieldManagerProcedure — customer statement reads accessible to all admin-tier roles
  getCustomerStatement: fieldManagerProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerStatement(input.zohoContactId);
      } catch (error: any) {
        return { error: error.message };
      }
    }),

  // Get customer invoices
  // T14 Item 3: fieldManagerProcedure — customer invoice reads accessible to all admin-tier roles
  getCustomerInvoices: fieldManagerProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerInvoices(input.zohoContactId);
      } catch (error: any) {
        return { error: error.message };
      }
    }),

  // Get customer payments
  // T14 Item 3: fieldManagerProcedure — customer payment reads accessible to all admin-tier roles
  getCustomerPayments: fieldManagerProcedure
    .input(z.object({ zohoContactId: z.string() }))
    .query(async ({ input }) => {
      try {
        return await zoho.getCustomerPayments(input.zohoContactId);
      } catch (error: any) {
        return { error: error.message };
      }
    }),

  // Get all sync jobs
  // T14 Item 3: adminProcedure — sync job management is admin-tier
  getAllSyncJobs: adminProcedure.query(async () => {
    try {
      return await scheduler.getAllSyncJobs();
    } catch (error: any) {
      console.error('[Integrations] Error getting sync jobs:', error);
      return [];
    }
  }),

  // Create a new sync job
  // T14 Item 3: adminProcedure — sync job management is admin-tier
  createSyncJob: adminProcedure
    .input(z.object({
      jobName: z.string(),
      scheduleType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
      scheduleTime: z.string().optional(),
      scheduleDay: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        await scheduler.createSyncJob(
          input.jobName,
          input.scheduleType,
          input.scheduleTime,
          input.scheduleDay
        );
        return { success: true };
      } catch (error: any) {
        console.error('[Integrations] Error creating sync job:', error);
        return { success: false, error: error.message };
      }
    }),

  // Update a sync job
  // T14 Item 3: adminProcedure — sync job management is admin-tier
  updateSyncJob: adminProcedure
    .input(z.object({
      jobId: z.number(),
      enabled: z.boolean().optional(),
      scheduleType: z.enum(['hourly', 'daily', 'weekly', 'monthly']).optional(),
      scheduleTime: z.string().optional(),
      scheduleDay: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      try {
        await scheduler.updateSyncJob(input.jobId, {
          enabled: input.enabled,
          scheduleType: input.scheduleType,
          scheduleTime: input.scheduleTime,
          scheduleDay: input.scheduleDay,
        });
        return { success: true };
      } catch (error: any) {
        console.error('[Integrations] Error updating sync job:', error);
        return { success: false, error: error.message };
      }
    }),

  // Delete a sync job
  // T14 Item 3: superadminProcedure — sync job deletion is destructive, superadmin only
  deleteSyncJob: superadminProcedure
    .input(z.object({ jobId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        await scheduler.deleteSyncJob(input.jobId);
        return { success: true };
      } catch (error: any) {
        console.error('[Integrations] Error deleting sync job:', error);
        return { success: false, error: error.message };
      }
    }),

  // Get sync history
  // T14 Item 3: adminProcedure — sync history reads are admin-tier
  getSyncHistory: adminProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input }) => {
      try {
        return await scheduler.getSyncHistory(input.limit);
      } catch (error: any) {
        console.error('[Integrations] Error getting sync history:', error);
        return [];
      }
    }),
});

