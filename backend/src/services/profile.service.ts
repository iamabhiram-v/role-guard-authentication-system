import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../utils/errors';

interface UpdateProfileInput {
  username?: string;
  fullName?: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  phone?: string;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

export class ProfileService {
  async getProfile(userId: string) {
    const result = await db.query(
      `SELECT id, email, username, full_name, bio, avatar_url, phone, role,
              is_active, last_login, created_at, updated_at, two_fa_enabled
       FROM users WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('User profile not found');
    }

    return result.rows[0];
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const existing = await this.getProfile(userId);

    if (data.username && data.username !== existing.username) {
      const usernameCheck = await db.query(
        `SELECT id FROM users WHERE username = $1 AND id != $2`,
        [data.username, userId]
      );
      if (usernameCheck.rows.length > 0) {
        throw new BadRequestError('Username already taken');
      }
    }

    if (data.email && data.email !== existing.email) {
      const emailCheck = await db.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`,
        [data.email, userId]
      );
      if (emailCheck.rows.length > 0) {
        throw new BadRequestError('Email already in use');
      }
    }

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (data.username !== undefined) {
      fields.push(`username = $${idx++}`);
      values.push(data.username);
    }
    if (data.fullName !== undefined) {
      fields.push(`full_name = $${idx++}`);
      values.push(data.fullName);
    }
    if (data.email !== undefined) {
      fields.push(`email = $${idx++}`);
      values.push(data.email);
    }
    if (data.bio !== undefined) {
      fields.push(`bio = $${idx++}`);
      values.push(data.bio);
    }
    if (data.avatarUrl !== undefined) {
      fields.push(`avatar_url = $${idx++}`);
      values.push(data.avatarUrl);
    }
    if (data.phone !== undefined) {
      fields.push(`phone = $${idx++}`);
      values.push(data.phone);
    }

    if (fields.length === 0) {
      throw new BadRequestError('No fields provided to update');
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
                    RETURNING id, email, username, full_name, bio, avatar_url, phone, role,
                              is_active, last_login, created_at, updated_at`;

    const result = await db.query(query, values);
    return result.rows[0];
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const userResult = await db.query(
      `SELECT password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const { password_hash } = userResult.rows[0];
    const isValid = await bcrypt.compare(data.currentPassword, password_hash);

    if (!isValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const isSamePassword = await bcrypt.compare(data.newPassword, password_hash);
    if (isSamePassword) {
      throw new BadRequestError('New password must be different from current password');
    }

    const newHash = await bcrypt.hash(data.newPassword, 12);

    await db.query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [newHash, userId]
    );

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async toggle2FA(userId: string, enabled: boolean) {
    const result = await db.query(
      `UPDATE users SET two_fa_enabled = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, username, full_name, bio, avatar_url, phone, role,
                 is_active, last_login, created_at, updated_at, two_fa_enabled`,
      [enabled, userId]
    );
    if (result.rows.length === 0) throw new NotFoundError('User not found');
    return result.rows[0];
  }

  async deleteAccount(userId: string, password: string) {
    const userResult = await db.query(
      `SELECT email, password_hash FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new NotFoundError('User not found');
    }

    const { email, password_hash } = userResult.rows[0];
    const isValid = await bcrypt.compare(password, password_hash);

    if (!isValid) {
      throw new UnauthorizedError('Password is incorrect');
    }

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO account_deletions (user_id, email) VALUES ($1, $2)`,
        [userId, email]
      );

      await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return { message: 'Account deleted successfully' };
  }
}

export const profileService = new ProfileService();