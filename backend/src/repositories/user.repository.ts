import { db } from '../config/database';
import { User } from '../types/user';

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] ?? null;
  },

  async findById(id: string): Promise<User | null> {
    const result = await db.query(
      `SELECT id, email, username, role, is_active, last_login,
              created_at, updated_at, two_fa_enabled
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdWithProfile(id: string): Promise<User | null> {
    const result = await db.query(
      `SELECT id, email, username, full_name, bio, avatar_url, phone, role,
              is_active, last_login, created_at, updated_at, two_fa_enabled
       FROM users WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByIdForAuth(id: string): Promise<Pick<User, 'id' | 'email' | 'role'> | null> {
    const result = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findAllActive(): Promise<Pick<User, 'id' | 'email' | 'username'>[]> {
    const result = await db.query(
      'SELECT id, email, username FROM users WHERE is_active = true'
    );
    return result.rows;
  },

  async existsByEmail(email: string): Promise<boolean> {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows.length > 0;
  },

  async existsByUsername(username: string): Promise<boolean> {
    const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    return result.rows.length > 0;
  },

  async existsByEmailExcluding(email: string, excludeId: string): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM users WHERE email = $1 AND id != $2',
      [email, excludeId]
    );
    return result.rows.length > 0;
  },

  async existsByUsernameExcluding(username: string, excludeId: string): Promise<boolean> {
    const result = await db.query(
      'SELECT id FROM users WHERE username = $1 AND id != $2',
      [username, excludeId]
    );
    return result.rows.length > 0;
  },

  async create(data: {
    email: string;
    username: string;
    passwordHash: string;
  }): Promise<User> {
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'user', true, NOW(), NOW())
       RETURNING id, email, username, role, is_active, created_at, updated_at`,
      [data.email, data.username, data.passwordHash]
    );
    return result.rows[0];
  },

  async updateLastLogin(id: string): Promise<void> {
    await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [id]);
  },

  async updateLastLoginReturning(id: string): Promise<User> {
    const result = await db.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows[0];
  },

  // password_hash is intentionally empty — OAuth users can't use password login.
  async createOAuthUser(data: { email: string; username: string }): Promise<User> {
    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, role, is_active, last_login, created_at, updated_at)
       VALUES ($1, $2, $3, 'user', true, NOW(), NOW(), NOW())
       RETURNING *`,
      [data.email, data.username, '']
    );
    return result.rows[0];
  },

  async findActiveAdminsWithPhone(): Promise<{ id: string; phone: string }[]> {
    const result = await db.query(
      `SELECT id, phone FROM users WHERE role = 'admin' AND is_active = true AND phone IS NOT NULL`
    );
    return result.rows;
  },

  async findActiveWithUnreadCount(): Promise<
    { id: string; email: string; username: string; unread_count: string }[]
  > {
    const result = await db.query(`
      SELECT u.id, u.email, u.username,
        (SELECT COUNT(*) FROM notifications n
           WHERE n.user_id = u.id
             AND n.is_read = false
             AND n.created_at > NOW() - INTERVAL '1 day') AS unread_count
      FROM users u
      WHERE u.is_active = true
    `);
    return result.rows;
  },

  async setOtp(id: string, otpHash: string, expiresAt: Date): Promise<void> {
    await db.query(
      'UPDATE users SET otp_code_hash = $1, otp_expires_at = $2 WHERE id = $3',
      [otpHash, expiresAt, id]
    );
  },

  async clearOtp(id: string): Promise<void> {
    await db.query(
      'UPDATE users SET otp_code_hash = NULL, otp_expires_at = NULL, last_login = NOW() WHERE id = $1',
      [id]
    );
  },

  async updateProfile(id: string, fields: string[], values: unknown[]): Promise<User> {
    const result = await db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${values.length}
       RETURNING id, email, username, full_name, bio, avatar_url, phone, role,
                 is_active, last_login, created_at, updated_at`,
      values
    );
    return result.rows[0];
  },

  async findPasswordHash(id: string): Promise<string | null> {
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0]?.password_hash ?? null;
  },

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [passwordHash, id]
    );
  },

  async toggle2FA(id: string, enabled: boolean): Promise<User> {
    const result = await db.query(
      `UPDATE users SET two_fa_enabled = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING id, email, username, full_name, bio, avatar_url, phone, role,
                 is_active, last_login, created_at, updated_at, two_fa_enabled`,
      [enabled, id]
    );
    return result.rows[0];
  },

  async findEmailAndPasswordHash(id: string): Promise<{ email: string; password_hash: string } | null> {
    const result = await db.query(
      'SELECT email, password_hash FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },

  async delete(id: string): Promise<void> {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  },

  async setNotificationsMuted(id: string, muted: boolean): Promise<void> {
    await db.query('UPDATE users SET notifications_muted = $1 WHERE id = $2', [muted, id]);
  },

  async getNotificationsMuted(id: string): Promise<boolean> {
    const result = await db.query(
      'SELECT notifications_muted FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0]?.notifications_muted ?? false;
  },

  async findUsernameAndEmail(id: string): Promise<{ username: string; email: string } | null> {
    const result = await db.query(
      'SELECT username, email FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] ?? null;
  },
};