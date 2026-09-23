import { notificationRepository } from '../repositories';

interface GetNotificationsInput {
  userId: string;
  filter?: string;
  page?: number;
}

export class NotificationService {
  async getNotifications({ userId, filter, page }: GetNotificationsInput) {
    const limit = 15;
    const currentPage = page ? Math.max(1, page) : 1;
    const offset = (currentPage - 1) * limit;
    const onlyUnread = filter === 'unread';

    const { rows, total } = await notificationRepository.findPagedByUser(
      userId,
      onlyUnread,
      limit,
      offset
    );

    return {
      notifications: rows,
      pagination: {
        page: currentPage,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getUnreadCount(userId: string) {
    return notificationRepository.countUnread(userId);
  }

  async markAsRead(userId: string, notificationId: string) {
    await notificationRepository.markOneRead(userId, notificationId);
  }

  async markAllAsRead(userId: string) {
    await notificationRepository.markAllRead(userId);
  }
}

export const notificationService = new NotificationService();