import { router, adminProcedure } from '../_core/trpc';
import { z } from 'zod';
import * as notificationDb from '../notificationDb';

export const adminNotificationsRouter = router({
  /**
   * Get all admin notifications
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  getAll: adminProcedure
    .query(async () => {
      return await notificationDb.getAllAdminNotifications();
    }),

  /**
   * Get unread admin notifications count
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  getUnreadCount: adminProcedure
    .query(async () => {
      const unread = await notificationDb.getUnreadAdminNotifications();
      return { count: unread.length };
    }),

  /**
   * Get unread admin notifications
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  getUnread: adminProcedure
    .query(async () => {
      return await notificationDb.getUnreadAdminNotifications();
    }),

  /**
   * Mark a specific notification as read
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  markAsRead: adminProcedure
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      return await notificationDb.markAdminNotificationRead(input.id);
    }),

  /**
   * Mark all notifications as read
   */
  // T14 Item 3: adminProcedure — admin notifications are admin-tier
  markAllAsRead: adminProcedure
    .mutation(async () => {
      return await notificationDb.markAllAdminNotificationsRead();
    }),
});
