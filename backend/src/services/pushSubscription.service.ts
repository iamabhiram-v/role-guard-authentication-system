import webpush from 'web-push';
import { pushSubscriptionRepository } from '../repositories';

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
    return pushSubscriptionRepository.upsert(
      userId,
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth
    );
  },

  async unsubscribe(userId: string, endpoint: string) {
    return pushSubscriptionRepository.deleteByEndpoint(userId, endpoint);
  },

  async getSubscriptions(userId: string) {
    return pushSubscriptionRepository.findAllByUser(userId);
  },

  async isSubscribed(userId: string) {
    const count = await pushSubscriptionRepository.countByUser(userId);
    return count > 0;
  },

  async sendPushToUser(
    userId: string,
    payload: { title: string; body: string; url?: string }
  ) {
    const subscriptions = await pushSubscriptionRepository.findAllByUser(userId);
    if (subscriptions.length === 0) return;

    const message = JSON.stringify(payload);

    await Promise.all(
      subscriptions.map(async (sub: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
            message
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await pushSubscriptionRepository.deleteById(sub.id);
          } else {
            console.error('[push] Failed to send push notification:', err.message);
          }
        }
      })
    );
  },
};