import { db } from '../config/database';

const DEFAULT_CATEGORIES = ['workspace_invite', 'job_failure', 'broadcast', 'general', 'payment'];

export const notificationPreferencesService = {
  async getPreferences(userId: string) {
    const result = await db.query(
      `SELECT category, email_enabled, in_app_enabled, sms_enabled FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    const existing = new Map(result.rows.map((r) => [r.category, r]));
    return DEFAULT_CATEGORIES.map((category) => ({
      category,
      email_enabled: existing.get(category)?.email_enabled ?? true,
      in_app_enabled: existing.get(category)?.in_app_enabled ?? true,
      sms_enabled: existing.get(category)?.sms_enabled ?? true,
    }));
  },

  async updatePreference(
    userId: string,
    category: string,
    updates: { email_enabled?: boolean; in_app_enabled?: boolean; sms_enabled?: boolean }
  ) {
    if (!DEFAULT_CATEGORIES.includes(category)) {
      throw new Error(`Unknown notification category: ${category}`);
    }

    const result = await db.query(
      `INSERT INTO notification_preferences (user_id, category, email_enabled, in_app_enabled, sms_enabled)
       VALUES ($1, $2, COALESCE($3, true), COALESCE($4, true), COALESCE($5, true))
       ON CONFLICT (user_id, category)
       DO UPDATE SET
         email_enabled = COALESCE($3, notification_preferences.email_enabled),
         in_app_enabled = COALESCE($4, notification_preferences.in_app_enabled),
         sms_enabled = COALESCE($5, notification_preferences.sms_enabled),
         updated_at = NOW()
       RETURNING category, email_enabled, in_app_enabled, sms_enabled`,
      [userId, category, updates.email_enabled ?? null, updates.in_app_enabled ?? null, updates.sms_enabled ?? null]
    );

    return result.rows[0];
  },

  async isMasterMuted(userId: string): Promise<boolean> {
    const result = await db.query(`SELECT notifications_muted FROM users WHERE id = $1`, [userId]);
    return result.rows[0]?.notifications_muted ?? false;
  },

  async setMasterMute(userId: string, muted: boolean): Promise<void> {
    await db.query(`UPDATE users SET notifications_muted = $1 WHERE id = $2`, [muted, userId]);
  },

  async isChannelEnabled(userId: string, category: string, channel: 'email' | 'in_app' | 'sms') {
    const muted = await this.isMasterMuted(userId);
    if (muted) return false;

    const result = await db.query(
      `SELECT email_enabled, in_app_enabled, sms_enabled FROM notification_preferences WHERE user_id = $1 AND category = $2`,
      [userId, category]
    );
    if (result.rows.length === 0) return true;

    if (channel === 'email') return result.rows[0].email_enabled;
    if (channel === 'sms') return result.rows[0].sms_enabled;
    return result.rows[0].in_app_enabled;
  },
};