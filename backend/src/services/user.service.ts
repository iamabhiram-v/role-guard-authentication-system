import crypto from 'crypto';
import { db } from '../config/database';
import { User, AuthTokens, LoginRequest, RegisterRequest } from '../types/user';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateTokens } from '../utils/jwt';
import { processEmailJob } from './email.queue';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';

const OTP_EXPIRY_MINUTES = 5;

const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

export const userService = {
  async register(data: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [data.email, data.username]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('Email or username already in use');
    }

    const passwordHash = await hashPassword(data.password);

    const result = await db.query(
      `INSERT INTO users (email, username, password_hash, role, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, email, username, role, is_active, created_at, updated_at`,
      [data.email, data.username, passwordHash, 'user', true]
    );

    const user = result.rows[0] as User;

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, tokens };
  },


  async login(data: LoginRequest): Promise<
    { requiresOtp: true; email: string } |
    { requiresOtp: false; user: User; tokens: AuthTokens }
  > {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [data.email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user = result.rows[0] as User;

    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    const passwordMatch = await verifyPassword(data.password, user.password_hash);

    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

  
    if (!user.two_fa_enabled) {
      await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
      const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });
      return { requiresOtp: false, user, tokens };
    }

    
    const otp = generateOtp();
    const otpHash = await hashPassword(otp);

    await db.query(
      `UPDATE users
       SET otp_code_hash = $1, otp_expires_at = NOW() + INTERVAL '${OTP_EXPIRY_MINUTES} minutes'
       WHERE id = $2`,
      [otpHash, user.id]
    );

    await processEmailJob({
      to: user.email,
      subject: 'Your RoleGuard verification code',
      body: `
        <div style="font-family: sans-serif;">
          <h2>Your verification code</h2>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 4px;">${otp}</p>
          <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });

    return { requiresOtp: true, email: user.email };
  },

  
   
  async verifyOtp(email: string, code: string): Promise<{ user: User; tokens: AuthTokens }> {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);

    if (result.rows.length === 0) {
      throw new Error('Invalid or expired code');
    }

    const user = result.rows[0] as User;

    if (!user.otp_code_hash || !user.otp_expires_at) {
      throw new Error('No verification code was requested');
    }

    if (new Date(user.otp_expires_at).getTime() < Date.now()) {
      throw new Error('Code has expired. Please log in again.');
    }

    const codeMatch = await verifyPassword(code, user.otp_code_hash);

    if (!codeMatch) {
      throw new Error('Invalid or expired code');
    }

    await db.query(
      'UPDATE users SET otp_code_hash = NULL, otp_expires_at = NULL, last_login = NOW() WHERE id = $1',
      [user.id]
    );

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    
    try {
      const emailAllowed = await notificationPreferencesService.isChannelEnabled(user.id, 'general', 'email');
      if (emailAllowed) {
        await queueService.enqueue('email', {
          to: user.email,
          subject: 'New login to your RoleGuard account',
          body: `<p>Hi ${user.username},</p><p>Your account was just signed in to. If this was you, no action is needed. If you don't recognize this activity, please change your password immediately.</p>`,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to queue login notification:', notifyErr);
    }

    return { user, tokens };
  },

  async refreshToken(userId: string): Promise<AuthTokens> {
    const result = await db.query(
      'SELECT id, email, role FROM users WHERE id = $1 AND is_active = true',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found or inactive');
    }

    const user = result.rows[0];

    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return tokens;
  },

  async logout(userId: string): Promise<void> {
    const result = await db.query('SELECT id, email, username FROM users WHERE id = $1', [userId]);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    try {
      const emailAllowed = await notificationPreferencesService.isChannelEnabled(user.id, 'general', 'email');
      if (emailAllowed) {
        await queueService.enqueue('email', {
          to: user.email,
          subject: 'You were signed out of RoleGuard',
          body: `<p>Hi ${user.username},</p><p>You were just signed out of your RoleGuard account. If this wasn't you, someone else may have access — please change your password.</p>`,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to queue logout notification:', notifyErr);
    }
  },

  async getUserById(userId: string): Promise<User> {
    const result = await db.query(
      'SELECT id, email, username, role, is_active, last_login, created_at, updated_at, two_fa_enabled FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    return result.rows[0] as User;
  },

  async validateEmailExists(email: string): Promise<boolean> {
    const result = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    return result.rows.length > 0;
  },

  async validateUsernameExists(username: string): Promise<boolean> {
    const result = await db.query('SELECT id FROM users WHERE username = $1', [username]);
    return result.rows.length > 0;
  },
};