import webpush from 'web-push';
import { db } from '../config/database';

// VAPID keys identify this server to push services (Chrome, Firefox, etc).
// Generate once with: npx web-push generate-vapid-keys
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:admin@roleguard.com',
  process.env.VAPID_PUBLIC_KEY || '',
  process.env.VAPID_PRIVATE_KEY || ''
);

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
      `SELECT id, endpoint, p256dh_key, auth_key, created_at FROM push_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
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

  // Sends a push notification to every device the user has subscribed on.
  // If a subscription is dead (endpoint expired/unsubscribed at browser level),
  // web-push throws 404/410 — we remove that subscription so it stops being retried.
  async sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
    const subscriptions = await this.getSubscriptions(userId);
    if (subscriptions.length === 0) return;

    const message = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
            },
            message
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await db.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
          } else {
            console.error('[push] Failed to send push notification:', err.message);
          }
        }
      })
    );
  },
};