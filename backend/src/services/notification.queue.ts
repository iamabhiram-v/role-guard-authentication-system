import { notificationRepository } from '../repositories';
import { NotificationJobPayload } from '../types/job';
import { pushSubscriptionService } from './pushSubscription.service';

const DEDUP_WINDOW_MINUTES = 5;

export const processNotificationJob = async (payload: NotificationJobPayload) => {

  const isDuplicate = await notificationRepository.existsRecentDuplicate(
    payload.userId,
    payload.title,
    payload.message,
    DEDUP_WINDOW_MINUTES
  );

  if (isDuplicate) {
    return; 
  }

  await notificationRepository.create(payload.userId, payload.title, payload.message);

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