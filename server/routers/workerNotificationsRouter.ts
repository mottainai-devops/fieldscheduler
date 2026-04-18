import { router, publicProcedure } from '../_core/trpc';
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
   */
  markAsRead: publicProcedure
    .input(z.object({
      id: z.number(),
      workerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await notificationDb.markWorkerNotificationRead(input.id, input.workerId);
    }),

  /**
   * Mark all notifications as read for a worker
   */
  markAllAsRead: publicProcedure
    .input(z.object({
      workerId: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await notificationDb.markAllWorkerNotificationsRead(input.workerId);
    }),
});
