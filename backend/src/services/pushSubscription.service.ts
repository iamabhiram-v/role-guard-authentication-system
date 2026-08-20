import { db } from '../config/database';

export const pushSubscriptionService = {
  async subscribe(
    userId: string,
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  ) {
    const result = await db.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh_key, auth_key)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint)
       DO UPDATE SET p256dh_key = $3, auth_key = $4
       RETURNING id, endpoint, created_at`,
      [userId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
    );
    return result.rows[0];
  },

  async unsubscribe(userId: string, endpoint: string) {
    const result = await db.query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2 RETURNING id`,
      [userId, endpoint]
    );
    return result.rows.length > 0;
  },

  async getSubscriptions(userId: string) {
    const result = await db.query(
      `SELECT id, endpoint, created_at FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async isSubscribed(userId: string) {
    const result = await db.query(
      `SELECT COUNT(*)::int AS count FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0].count > 0;
  },
};