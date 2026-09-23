import { db } from '../config/database';

export const notificationPreferencesRepository = {
  async findAllByUser(userId: string) {
    const result = await db.query(
      `SELECT category, email_enabled, in_app_enabled, sms_enabled
       FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );
    return result.rows;
  },

  async findByUserAndCategory(userId: string, category: string) {
    const result = await db.query(
      `SELECT email_enabled, in_app_enabled, sms_enabled
       FROM notification_preferences WHERE user_id = $1 AND category = $2`,
      [userId, category]
    );
    return result.rows[0] ?? null;
  },

  async upsert(
    userId: string,
    category: string,
    updates: {
      email_enabled?: boolean | null;
      in_app_enabled?: boolean | null;
      sms_enabled?: boolean | null;
    }
  ) {
    const result = await db.query(
      `INSERT INTO notification_preferences (user_id, category, email_enabled, in_app_enabled, sms_enabled)
       VALUES ($1, $2, COALESCE($3, true), COALESCE($4, true), COALESCE($5, true))
       ON CONFLICT (user_id, category)
       DO UPDATE SET
         email_enabled  = COALESCE($3, notification_preferences.email_enabled),
         in_app_enabled = COALESCE($4, notification_preferences.in_app_enabled),
         sms_enabled    = COALESCE($5, notification_preferences.sms_enabled),
         updated_at     = NOW()
       RETURNING category, email_enabled, in_app_enabled, sms_enabled`,
      [
        userId,
        category,
        updates.email_enabled ?? null,
        updates.in_app_enabled ?? null,
        updates.sms_enabled ?? null,
      ]
    );
    return result.rows[0];
  },
};