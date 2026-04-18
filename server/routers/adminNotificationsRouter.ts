import { router, publicProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as notificationDb from '../notificationDb';

export const adminNotificationsRouter = router({
  /**
   * Get all admin notifications
   */
  getAll: publicProcedure
    .query(async () => {
      return await notificationDb.getAllAdminNotifications();
    }),

  /**
   * Get unread admin notifications count
   */
  getUnreadCount: publicProcedure
    .query(async () => {
      const unread = await notificationDb.getUnreadAdminNotifications();
      return { count: unread.length };
    }),

  /**
   * Get unread admin notifications
   */
  getUnread: publicProcedure
    .query(async () => {
      return await notificationDb.getUnreadAdminNotifications();
    }),

  /**
   * Mark a specific notification as read
   */
  markAsRead: publicProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await notificationDb.markAdminNotificationRead(input.id);
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: publicProcedure
    .mutation(async () => {
      return await notificationDb.markAllAdminNotificationsRead();
    }),
});
