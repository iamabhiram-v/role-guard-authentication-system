import cron from 'node-cron';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';
import { pushSubscriptionService } from './pushSubscription.service';
import { jobRepository, userRepository } from '../repositories';

export const startScheduler = () => {
  
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running scheduled cleanup task');
    await jobRepository.deleteCompletedOlderThan7Days();
  });

  // Re-engagement digest: nudges users who have unread activity in the last 24h,
  // and only if they haven't opted out of "general" notifications.
  // Sends both an email and a push notification — this is a re-engagement
  // nudge about *existing* unread notifications, so it does NOT enqueue a
  // new 'notification' job (that would create a duplicate in-app row).
  cron.schedule('0 9 * * *', async () => {
    console.log('📧 Enqueueing daily re-engagement digest');

    const users = await userRepository.findActiveWithUnreadCount();

    for (const user of users) {
      const unreadCount = Number(user.unread_count);

      // Skip users with nothing new — avoids spamming inactive/idle accounts.
      if (unreadCount === 0) continue;

      const title = `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''} on RoleGuard`;
      const message = `Log in to RoleGuard to check ${unreadCount > 1 ? 'them' : 'it'} out.`;

      const emailAllowed = await notificationPreferencesService.isChannelEnabled(
        user.id,
        'general',
        'email'
      );
      if (emailAllowed) {
        await queueService.enqueue('email', {
          to: user.email,
          subject: title,
          body: `<p>Hi ${user.username},</p><p>You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''} waiting for you. ${message}</p>`,
        });
      }

      // Nudge outside the browser too, if this user has push enabled.
      const pushAllowed = await notificationPreferencesService.isChannelEnabled(
        user.id,
        'general',
        'in_app'
      );
      if (pushAllowed) {
        try {
          await pushSubscriptionService.sendPushToUser(user.id, { title, body: message });
        } catch (pushErr) {
          console.error('[scheduler] Failed to send re-engagement push:', pushErr);
        }
      }
    }
  });

  console.log('⏰ Scheduled tasks registered');
};