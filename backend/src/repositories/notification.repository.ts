import { db } from '../config/database';

export const notificationRepository = {
  async findPagedByUser(
    userId: string,
    onlyUnread: boolean,
    limit: number,
    offset: number
  ) {
    const where = onlyUnread
      ? 'WHERE user_id = $1 AND is_read = false'
      : 'WHERE user_id = $1';

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS total FROM notifications ${where}`,
      [userId]
    );
    const total = countResult.rows[0]?.total ?? 0;

    const result = await db.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return { rows: result.rows, total };
  },

  async countUnread(userId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    return result.rows[0].count;
  },

  async markOneRead(userId: string, notificationId: string): Promise<void> {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  },

  async markAllRead(userId: string): Promise<void> {
    await db.query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId]
    );
  },

  async countByPeriod(days: number): Promise<number> {
    const result = await db.query(
      `SELECT COUNT(*)::int AS total FROM notifications
       WHERE created_at > NOW() - ($1::int || ' days')::interval`,
      [days]
    );
    return result.rows[0].total;
  },
};