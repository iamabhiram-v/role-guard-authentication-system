import bcrypt from 'bcrypt';
import { db } from '../config/database';
import { userRepository, accountDeletionRepository } from '../repositories';
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
    const user = await userRepository.findByIdWithProfile(userId);
    if (!user) throw new NotFoundError('User profile not found');
    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const existing = await this.getProfile(userId);

    if (data.username && data.username !== existing.username) {
      const taken = await userRepository.existsByUsernameExcluding(data.username, userId);
      if (taken) throw new BadRequestError('Username already taken');
    }

    if (data.email && data.email !== existing.email) {
      const taken = await userRepository.existsByEmailExcluding(data.email, userId);
      if (taken) throw new BadRequestError('Email already in use');
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.username  !== undefined) { fields.push(`username = $${idx++}`);   values.push(data.username); }
    if (data.fullName  !== undefined) { fields.push(`full_name = $${idx++}`);  values.push(data.fullName); }
    if (data.email     !== undefined) { fields.push(`email = $${idx++}`);      values.push(data.email); }
    if (data.bio       !== undefined) { fields.push(`bio = $${idx++}`);        values.push(data.bio); }
    if (data.avatarUrl !== undefined) { fields.push(`avatar_url = $${idx++}`); values.push(data.avatarUrl); }
    if (data.phone     !== undefined) { fields.push(`phone = $${idx++}`);      values.push(data.phone); }

    if (fields.length === 0) throw new BadRequestError('No fields provided to update');

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(userId);

    return userRepository.updateProfile(userId, fields, values);
  }

  async changePassword(userId: string, data: ChangePasswordInput) {
    const passwordHash = await userRepository.findPasswordHash(userId);
    if (!passwordHash) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(data.currentPassword, passwordHash);
    if (!isValid) throw new UnauthorizedError('Current password is incorrect');

    const isSame = await bcrypt.compare(data.newPassword, passwordHash);
    if (isSame) throw new BadRequestError('New password must be different from current password');

    const newHash = await bcrypt.hash(data.newPassword, 12);
    await userRepository.updatePassword(userId, newHash);

    return { message: 'Password changed successfully. Please log in again.' };
  }

  async toggle2FA(userId: string, enabled: boolean) {
    const user = await userRepository.toggle2FA(userId, enabled);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }

  async deleteAccount(userId: string, password: string) {
    const record = await userRepository.findEmailAndPasswordHash(userId);
    if (!record) throw new NotFoundError('User not found');

    const isValid = await bcrypt.compare(password, record.password_hash);
    if (!isValid) throw new UnauthorizedError('Password is incorrect');

    const client = await db.connect();
    try {
      await client.query('BEGIN');
      await accountDeletionRepository.insert(client, userId, record.email);
      await userRepository.delete(userId);
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