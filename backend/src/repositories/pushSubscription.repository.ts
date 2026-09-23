import { db } from '../config/database';

export const pushSubscriptionRepository = {
  async upsert(
    userId: string,
    endpoint: string,
    p256dhKey: string,
    authKey: string
  ) {
    const result = await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET p256dh_key = $3, auth_key = $4
       RETURNING id, endpoint, created_at`,
      [userId, endpoint, p256dhKey, authKey]
    );
    return result.rows[0];
  },

  async deleteByEndpoint(userId: string, endpoint: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id',
      [userId, endpoint]
    );
    return result.rows.length > 0;
  },

  async deleteById(id: string): Promise<void> {
    await db.query('DELETE FROM push_subscriptions WHERE id = $1', [id]);
  },

  async findAllByUser(userId: string) {
    const result = await db.query(
      `SELECT id, endpoint, p256dh_key, auth_key, created_at
       FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async countByUser(userId: string): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE user_id = $1',
      [userId]
    );
    return result.rows[0].count;
  },
};