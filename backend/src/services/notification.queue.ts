import { db } from '../config/database';
import { NotificationJobPayload } from '../types/job';
import { pushSubscriptionService } from './pushSubscription.service';

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

  // Best-effort: also push to any devices the user has subscribed on.
  // Failures here (dead subscriptions, network errors) must never fail the job —
  // the in-app notification above has already been saved successfully.
  try {
    await pushSubscriptionService.sendPushToUser(payload.userId, {
      title: payload.title,
      body: payload.message,
    });
  } catch (err: any) {
    console.error('[notification.queue] Push send failed:', err.message);
  }
};