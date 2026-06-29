// T20: workerProcedure added — Bearer token authentication for mobile write mutations
import { router, publicProcedure, workerProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as notificationDb from '../notificationDb';

export const workerNotificationsRouter = router({
  /**
   * Get all notifications for a worker
   */
  getWorkerNotifications: publicProcedure
    .input(z.object({
      workerId: z.number(),
    }))
    .query(async ({ input }) => {
      return await notificationDb.getWorkerNotifications(input.workerId);
    }),

  /**
   * Get unread notifications count for a worker
   */
  getUnreadCount: publicProcedure
    .input(z.object({
      workerId: z.number(),
    }))
    .query(async ({ input }) => {
      const unread = await notificationDb.getUnreadWorkerNotifications(input.workerId);
      return { count: unread.length };
    }),

  /**
   * Mark a specific notification as read
   * T19: workerId added to fix silent Zod rejection (Pattern #45)
   * T20: workerProcedure — workerId now derived from ctx (no longer client-sent)
   */
  markAsRead: workerProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      return await notificationDb.markWorkerNotificationRead(input.id, ctx.workerId);
    }),

  /**
   * Mark all notifications as read for a worker
   * T20: workerProcedure — workerId derived from ctx (no longer client-sent)
   */
  markAllAsRead: workerProcedure
    .mutation(async ({ ctx }) => {
      return await notificationDb.markAllWorkerNotificationsRead(ctx.workerId);
    }),
});
