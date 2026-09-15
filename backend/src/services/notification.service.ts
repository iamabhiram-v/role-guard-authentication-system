import { db } from '../config/database';

interface GetNotificationsInput {
  userId: string;
  filter?: string;
  page?: number;
}

export class NotificationService {
  async getNotifications({ userId, filter, page }: GetNotificationsInput) {
    const limit = 15;
    const currentPage = page ? Math.max(1, page) : 1;
    const offset = (currentPage - 1) * limit;

    const whereClause =
      filter === 'unread' ? `WHERE user_id = $1 AND is_read = false` : `WHERE user_id = $1`;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM notifications ${whereClause}`,
      [userId]
    );
    const total = countResult.rows[0]?.total || 0;

    const result = await db.query(
      `SELECT * FROM notifications ${whereClause} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return {
      notifications: result.rows,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getUnreadCount(userId: string) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
    return result.rows[0].count;
  }

  async markAsRead(userId: string, notificationId: string) {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2`,
      [notificationId, userId]
    );
  }

  async markAllAsRead(userId: string) {
    await db.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false`,
      [userId]
    );
  }
}

export const notificationService = new NotificationService();