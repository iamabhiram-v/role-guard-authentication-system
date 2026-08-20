import { db } from '../config/database';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';

export const announcementService = {
  async createBroadcast(createdBy: string, title: string, message: string) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Only one announcement should ever be "the current banner" — without
      // this, every previously-sent broadcast stays active forever, and
      // users have to dismiss each one individually across logins before
      // they stop reappearing.
      await client.query(`UPDATE announcements SET is_active = false WHERE is_active = true`);

      const announcementResult = await client.query(
        `INSERT INTO announcements (title, message, created_by) VALUES ($1, $2, $3) RETURNING *`,
        [title, message, createdBy]
      );
      const announcement = announcementResult.rows[0];

      const usersResult = await client.query(
        `SELECT id, email, username FROM users WHERE is_active = true`
      );

      await client.query('COMMIT');

      // Enqueue jobs after commit so a queue failure doesn't roll back the announcement itself
      for (const user of usersResult.rows) {
        const inAppEnabled = await notificationPreferencesService.isChannelEnabled(user.id, 'broadcast', 'in_app');
        const emailEnabled = await notificationPreferencesService.isChannelEnabled(user.id, 'broadcast', 'email');

        if (inAppEnabled) {
          await queueService.enqueue(
            'notification',
            { userId: user.id, title: `📣 ${title}`, message },
            { createdBy }
          );
        }

        if (emailEnabled) {
          await queueService.enqueue(
            'email',
            {
              to: user.email,
              subject: `Announcement: ${title}`,
              body: `<p>Hi ${user.username},</p><p>${message}</p>`,
            },
            { createdBy }
          );
        }
      }

      return announcement;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  // Now checks the user's 'broadcast' in-app preference before returning an
  // announcement to display. If they've disabled in-app announcements, the
  // banner never appears for them — regardless of whether it's active or
  // whether they've dismissed it.
  async getActiveAnnouncement(userId: string) {
    const inAppEnabled = await notificationPreferencesService.isChannelEnabled(userId, 'broadcast', 'in_app');
    if (!inAppEnabled) return null;

    const result = await db.query(
      `SELECT a.* FROM announcements a
       WHERE a.is_active = true
       AND NOT EXISTS (
         SELECT 1 FROM announcement_dismissals d
         WHERE d.announcement_id = a.id AND d.user_id = $1
       )
       ORDER BY a.created_at DESC
       LIMIT 1`,
      [userId]
    );
    return result.rows[0] || null;
  },

  async dismissAnnouncement(announcementId: string, userId: string) {
    await db.query(
      `INSERT INTO announcement_dismissals (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [announcementId, userId]
    );
  },

  async deactivateAnnouncement(announcementId: string) {
    await db.query(`UPDATE announcements SET is_active = false WHERE id = $1`, [announcementId]);
  },

  async listAnnouncements() {
    const result = await db.query(`SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50`);
    return result.rows;
  },
};