import { db, DbClient } from '../config/database';

export const announcementRepository = {
  async deactivateAll(client: DbClient): Promise<void> {
    await client.query(
      'UPDATE announcements SET is_active = false WHERE is_active = true'
    );
  },

  async create(
    client: DbClient,
    data: { title: string; message: string; createdBy: string }
  ) {
    const result = await client.query(
      'INSERT INTO announcements (title, message, created_by) VALUES ($1, $2, $3) RETURNING *',
      [data.title, data.message, data.createdBy]
    );
    return result.rows[0];
  },

  async findActiveNotDismissedByUser(userId: string) {
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
    return result.rows[0] ?? null;
  },

  async insertDismissal(announcementId: string, userId: string): Promise<void> {
    await db.query(
      `INSERT INTO announcement_dismissals (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING`,
      [announcementId, userId]
    );
  },

  async deactivateOne(id: string): Promise<void> {
    await db.query('UPDATE announcements SET is_active = false WHERE id = $1', [id]);
  },

  async findAll() {
    const result = await db.query(
      'SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50'
    );
    return result.rows;
  },
};