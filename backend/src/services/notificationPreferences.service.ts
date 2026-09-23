import { notificationPreferencesRepository } from '../repositories';
import { userRepository } from '../repositories';

const DEFAULT_CATEGORIES = ['workspace_invite', 'job_failure', 'broadcast', 'general', 'payment'];

export const notificationPreferencesService = {
  async getPreferences(userId: string) {
    const rows = await notificationPreferencesRepository.findAllByUser(userId);
    const existing = new Map(rows.map((r: any) => [r.category, r]));

    return DEFAULT_CATEGORIES.map((category) => ({
      category,
      email_enabled:  existing.get(category)?.email_enabled  ?? true,
      in_app_enabled: existing.get(category)?.in_app_enabled ?? true,
      sms_enabled:    existing.get(category)?.sms_enabled    ?? true,
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
    return notificationPreferencesRepository.upsert(userId, category, updates);
  },

  async isMasterMuted(userId: string): Promise<boolean> {
    return userRepository.getNotificationsMuted(userId);
  },

  async setMasterMute(userId: string, muted: boolean): Promise<void> {
    await userRepository.setNotificationsMuted(userId, muted);
  },

  async isChannelEnabled(
    userId: string,
    category: string,
    channel: 'email' | 'in_app' | 'sms'
  ): Promise<boolean> {
    const muted = await this.isMasterMuted(userId);
    if (muted) return false;

    const row = await notificationPreferencesRepository.findByUserAndCategory(userId, category);
    if (!row) return true;

    if (channel === 'email')  return row.email_enabled;
    if (channel === 'sms')    return row.sms_enabled;
    return row.in_app_enabled;
  },
};