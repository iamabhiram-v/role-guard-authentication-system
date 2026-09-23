import { DbClient } from '../config/database';

export const accountDeletionRepository = {
  async insert(client: DbClient, userId: string, email: string): Promise<void> {
    await client.query(
      'INSERT INTO account_deletions (user_id, email) VALUES ($1, $2)',
      [userId, email]
    );
  },
};