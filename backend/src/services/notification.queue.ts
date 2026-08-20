import { db } from '../config/database';
import { NotificationJobPayload } from '../types/job';

const DEDUP_WINDOW_MINUTES = 5;

export const processNotificationJob = async (payload: NotificationJobPayload) => {

  const existing = await db.query(
    `SELECT 1 FROM notifications
     WHERE user_id = $1 AND title = $2 AND message = $3
       AND created_at > NOW() - ($4 || ' minutes')::interval
     LIMIT 1`,
    [payload.userId, payload.title, payload.message, DEDUP_WINDOW_MINUTES]
  );

  if (existing.rows.length > 0) {
    return; 
  }

  await db.query(
    `INSERT INTO notifications (user_id, title, message, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [payload.userId, payload.title, payload.message]
  );
};