import { db } from '../config/database';
import { announcementRepository } from '../repositories';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';
import { userRepository } from '../repositories';

export const announcementService = {
  async createBroadcast(createdBy: string, title: string, message: string) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      await announcementRepository.deactivateAll(client);

      const announcement = await announcementRepository.create(client, {
        title,
        message,
        createdBy,
      });

      const users = await userRepository.findAllActive();

      await client.query('COMMIT');

      for (const user of users) {
        const inAppEnabled = await notificationPreferencesService.isChannelEnabled(
          user.id, 'broadcast', 'in_app'
        );
        const emailEnabled = await notificationPreferencesService.isChannelEnabled(
          user.id, 'broadcast', 'email'
        );

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

  async getActiveAnnouncement(userId: string) {
    const inAppEnabled = await notificationPreferencesService.isChannelEnabled(
      userId, 'broadcast', 'in_app'
    );
    if (!inAppEnabled) return null;

    return announcementRepository.findActiveNotDismissedByUser(userId);
  },

  async dismissAnnouncement(announcementId: string, userId: string) {
    await announcementRepository.insertDismissal(announcementId, userId);
  },

  async deactivateAnnouncement(announcementId: string) {
    await announcementRepository.deactivateOne(announcementId);
  },

  async listAnnouncements() {
    return announcementRepository.findAll();
  },
};