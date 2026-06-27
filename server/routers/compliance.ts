import { router, protectedProcedure, publicProcedure, adminProcedure, fieldManagerProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as complianceDb from '../complianceDb';
import * as notificationDb from '../notificationDb';
import * as emailService from '../emailService';
import { getDb } from '../db';
import { customers, workers, violationTypes, abatementNotices, complianceViolations } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';

// Helper: get customer with email
async function getCustomerWithEmail(customerId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(customers).where(eq(customers.id, customerId)).limit(1);
  return result[0] || null;
}

// Helper: get violation type name
async function getViolationTypeName(violationTypeId: number): Promise<string> {
  const db = await getDb();
  if (!db) return 'Unknown Violation';
  const result = await db.select().from(violationTypes).where(eq(violationTypes.id, violationTypeId)).limit(1);
  return result[0]?.name || 'Unknown Violation';
}

// Helper: get abatement notice with details
async function getAbatementNoticeWithDetails(noticeId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      id: abatementNotices.id,
      noticeNumber: abatementNotices.noticeNumber,
      customerId: abatementNotices.customerId,
      violationId: abatementNotices.violationId,
      dueDate: abatementNotices.dueDate,
      notes: abatementNotices.notes,
      status: abatementNotices.status,
    })
    .from(abatementNotices)
    .where(eq(abatementNotices.id, noticeId))
    .limit(1);
  return result[0] || null;
}

// Helper: get violation with worker info
async function getViolationWithWorker(violationId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      id: complianceViolations.id,
      customerId: complianceViolations.customerId,
      violationTypeId: complianceViolations.violationTypeId,
      reportedBy: complianceViolations.reportedBy,
      notes: complianceViolations.notes,
    })
    .from(complianceViolations)
    .where(eq(complianceViolations.id, violationId))
    .limit(1);
  return result[0] || null;
}

export const complianceRouter = router({
  /**
   * Get all violation types
   */
  getViolationTypes: publicProcedure
    .input(z.object({}).optional())
    .query(async () => {
      return await complianceDb.getAllViolationTypes();
    }),

  /**
   * Create a new violation type
   * T14 Item 3: adminProcedure — violation type management is admin-tier
   */
  createViolationType: adminProcedure
    .input(z.object({
      name: z.string(),
      description: z.string().optional(),
      severity: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      return await complianceDb.createViolationType(input);
    }),

  /**
   * Update an existing violation type
   */
  // T14 Item 3: adminProcedure — violation type management is admin-tier
  updateViolationType: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      description: z.string().optional(),
      severity: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await complianceDb.updateViolationType(id, data);
    }),

  /**
   * Get all violation types (alias for compatibility)
   */
  getAllViolationTypes: publicProcedure
    .query(async () => {
      return await complianceDb.getAllViolationTypes();
    }),

  /**
   * Create/Report a violation — triggers notifications
   */
  // SECURITY DEBT: This endpoint is publicly accessible and writes data without authenticating the caller.
  // The mobile Flutter app uses this endpoint without a session. Risk accepted for Tranche 14 because
  // system is pre-operational. To be hardened in a future security tranche by adding surveyToken
  // validation inside the handler. See SECURITY_DEBT.md.
  createViolation: publicProcedure
    .input(z.object({
      customerId: z.number(),
      violationTypeId: z.number(),
      reportedBy: z.number().optional(),
      notes: z.string().optional(),
      evidenceUrls: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // 1. Create the violation
      const result = await complianceDb.createViolation(input);

      // 2. Fire notifications asynchronously (don't block the response)
      setImmediate(async () => {
        try {
          const customer = await getCustomerWithEmail(input.customerId);
          const violationTypeName = await getViolationTypeName(input.violationTypeId);

          // 2a. Admin notification
          await notificationDb.createAdminNotification({
            type: 'new_violation',
            title: 'New Violation Reported',
            message: `A ${violationTypeName} violation has been reported for customer ${customer?.name || `#${input.customerId}`}.`,
            relatedId: input.customerId,
          });

          // 2b. Worker notification (if reportedBy is set)
          if (input.reportedBy) {
            await notificationDb.createWorkerNotification({
              workerId: input.reportedBy,
              type: 'violation_submitted',
              title: 'Violation Report Submitted',
              message: `Your ${violationTypeName} violation report for ${customer?.name || `customer #${input.customerId}`} has been recorded.`,
              relatedId: input.customerId,
            });
          }

          // 2c. Customer email (if email exists)
          if (customer?.email) {
            await emailService.sendViolationWarningEmail(
              customer.email,
              customer.name || 'Customer',
              violationTypeName,
              input.notes
            );
          }
        } catch (err) {
          console.error('[Notifications] Error sending violation notifications:', err);
        }
      });

      return result;
    }),

  /**
   * Get all violations
   */
  // T14 Item 3: fieldManagerProcedure — compliance reads accessible to all admin-tier roles
  getAllViolations: fieldManagerProcedure
    .query(async () => {
      return await complianceDb.getAllViolations();
    }),

  /**
   * Get violations for a customer
   */
  // T14 Item 3: fieldManagerProcedure — compliance reads accessible to all admin-tier roles
  getViolationsByCustomer: fieldManagerProcedure
    .input(z.object({
      customerId: z.number()
    }))
    .query(async ({ input }) => {
      return await complianceDb.getViolationsByCustomer(input.customerId);
    }),

  /**
   * Update violation status — triggers resolution notification
   */
  // T14 Item 3: adminProcedure — violation status updates are admin-tier
  updateViolationStatus: adminProcedure
    .input(z.object({
      violationId: z.number(),
      status: z.enum(["reported", "under_review", "resolved", "dismissed"]),
      resolutionNotes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await complianceDb.updateViolationStatus(input);

      // Fire notifications on resolution
      if (input.status === 'resolved') {
        setImmediate(async () => {
          try {
            const violation = await getViolationWithWorker(input.violationId);
            if (!violation) return;

            const customer = await getCustomerWithEmail(violation.customerId);
            const violationTypeName = await getViolationTypeName(violation.violationTypeId);

            // Admin notification
            await notificationDb.createAdminNotification({
              type: 'violation_resolved',
              title: 'Violation Resolved',
              message: `${violationTypeName} violation for ${customer?.name || `customer #${violation.customerId}`} has been marked as resolved.`,
              relatedId: violation.customerId,
            });
          } catch (err) {
            console.error('[Notifications] Error sending resolution notifications:', err);
          }
        });
      }

      return result;
    }),

  /**
   * Get all abatement notices
   */
  // T14 Item 3: fieldManagerProcedure — compliance reads accessible to all admin-tier roles
  getAllAbatementNotices: fieldManagerProcedure
    .query(async () => {
      return await complianceDb.getAllAbatementNotices();
    }),

  /**
   * Create an abatement notice — triggers notifications
   */
  // T14 Item 3: adminProcedure — abatement notice creation is admin-tier
  createAbatementNotice: adminProcedure
    .input(z.object({
      customerId: z.number(),
      violationId: z.number().optional(),
      noticeNumber: z.string().optional(),
      dueDate: z.date().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await complianceDb.createAbatementNotice(input);

      setImmediate(async () => {
        try {
          const customer = await getCustomerWithEmail(input.customerId);
          const noticeNumber = input.noticeNumber || `ABT-${Date.now()}`;
          let violationTypeName = 'Compliance Violation';

          if (input.violationId) {
            const violation = await getViolationWithWorker(input.violationId);
            if (violation) {
              violationTypeName = await getViolationTypeName(violation.violationTypeId);

              // Notify the reporting worker
              if (violation.reportedBy) {
                await notificationDb.createWorkerNotification({
                  workerId: violation.reportedBy,
                  type: 'notice_issued',
                  title: 'Abatement Notice Issued',
                  message: `An abatement notice (${noticeNumber}) has been issued for ${customer?.name || `customer #${input.customerId}`} regarding ${violationTypeName}.`,
                  relatedId: input.customerId,
                });
              }
            }
          }

          // Admin notification
          await notificationDb.createAdminNotification({
            type: 'notice_issued',
            title: 'Abatement Notice Issued',
            message: `Notice ${noticeNumber} issued for ${customer?.name || `customer #${input.customerId}`}.`,
            relatedId: input.customerId,
          });

          // Customer email
          if (customer?.email) {
            await emailService.sendAbatementNoticeEmail(
              customer.email,
              customer.name || 'Customer',
              noticeNumber,
              violationTypeName,
              input.dueDate,
              input.notes
            );
          }
        } catch (err) {
          console.error('[Notifications] Error sending abatement notice notifications:', err);
        }
      });

      return result;
    }),

  /**
   * Update abatement notice status — triggers compliance/escalation notifications
   */
  // T14 Item 3: adminProcedure — abatement notice status updates are admin-tier
  updateAbatementNoticeStatus: adminProcedure
    .input(z.object({
      noticeId: z.number(),
      status: z.string(),
      complianceDate: z.date().optional(),
    }))
    .mutation(async ({ input }) => {
      const result = await complianceDb.updateAbatementNoticeStatus(
        input.noticeId,
        input.status,
        input.complianceDate
      );

      setImmediate(async () => {
        try {
          const notice = await getAbatementNoticeWithDetails(input.noticeId);
          if (!notice) return;

          const customer = await getCustomerWithEmail(notice.customerId);
          const noticeNumber = notice.noticeNumber || `ABT-${notice.id}`;

          if (input.status === 'complied') {
            // Admin notification
            await notificationDb.createAdminNotification({
              type: 'compliance_achieved',
              title: 'Compliance Achieved',
              message: `Customer ${customer?.name || `#${notice.customerId}`} has complied with notice ${noticeNumber}.`,
              relatedId: notice.customerId,
            });

            // Customer email confirmation
            if (customer?.email) {
              await emailService.sendResolutionConfirmationEmail(
                customer.email,
                customer.name || 'Customer',
                noticeNumber
              );
            }

            // Notify the worker who reported the original violation
            if (notice.violationId) {
              const violation = await getViolationWithWorker(notice.violationId);
              if (violation?.reportedBy) {
                await notificationDb.createWorkerNotification({
                  workerId: violation.reportedBy,
                  type: 'compliance_achieved',
                  title: 'Customer Complied',
                  message: `${customer?.name || `Customer #${notice.customerId}`} has complied with notice ${noticeNumber}.`,
                  relatedId: notice.customerId,
                });
              }
            }
          } else if (input.status === 'escalated') {
            // Admin notification
            await notificationDb.createAdminNotification({
              type: 'escalation',
              title: 'Notice Escalated',
              message: `Notice ${noticeNumber} for ${customer?.name || `customer #${notice.customerId}`} has been escalated.`,
              relatedId: notice.customerId,
            });

            // Customer escalation email
            if (customer?.email) {
              await emailService.sendEscalationEmail(
                customer.email,
                customer.name || 'Customer',
                noticeNumber
              );
            }

            // Notify the worker who reported the original violation
            if (notice.violationId) {
              const violation = await getViolationWithWorker(notice.violationId);
              if (violation?.reportedBy) {
                await notificationDb.createWorkerNotification({
                  workerId: violation.reportedBy,
                  type: 'escalation',
                  title: 'Notice Escalated',
                  message: `Notice ${noticeNumber} for ${customer?.name || `customer #${notice.customerId}`} has been escalated to senior enforcement.`,
                  relatedId: notice.customerId,
                });
              }
            }
          }
        } catch (err) {
          console.error('[Notifications] Error sending status update notifications:', err);
        }
      });

      return result;
    }),
});
