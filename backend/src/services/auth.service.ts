import crypto from 'crypto';
import { userRepository } from '../repositories';
import { User, AuthTokens, LoginRequest, RegisterRequest } from '../types/user';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateTokens } from '../utils/jwt';
import { processEmailJob } from './email.queue';
import { queueService } from './queue.service';
import { notificationPreferencesService } from './notificationPreferences.service';
import { pushSubscriptionService } from './pushSubscription.service';

const OTP_EXPIRY_MINUTES = 5;

const generateOtp = (): string => {
  return crypto.randomInt(100000, 999999).toString();
};

type LoginResult =
  | { requiresOtp: true; email: string }
  | { requiresOtp: false; user: User; tokens: AuthTokens };

export const userService = {
  async register(data: RegisterRequest): Promise<{ user: User; tokens: AuthTokens }> {
    const emailInUse    = await userRepository.existsByEmail(data.email);
    const usernameInUse = await userRepository.existsByUsername(data.username);

    if (emailInUse || usernameInUse) {
      throw new Error('Email or username already in use');
    }

    const passwordHash = await hashPassword(data.password);
    const user = await userRepository.create({
      email: data.email,
      username: data.username,
      passwordHash,
    });

    const tokens = generateTokens({
      userId: user.id,
      email:  user.email,
      role:   user.role,
    });

    return { user, tokens };
  },

  async login(data: LoginRequest): Promise<LoginResult> {
    const user = await userRepository.findByEmail(data.email);

    if (!user) {
      throw new Error('Invalid email or password');
    }

    if (!user.is_active) {
      throw new Error('Account is inactive');
    }

    const passwordMatch = await verifyPassword(data.password, user.password_hash);
    if (!passwordMatch) {
      throw new Error('Invalid email or password');
    }

    if (!user.two_fa_enabled) {
      await userRepository.updateLastLogin(user.id);
      const tokens = generateTokens({
        userId: user.id,
        email:  user.email,
        role:   user.role,
      });
      return { requiresOtp: false, user, tokens };
    }

    const otp = generateOtp();
    const otpHash = await hashPassword(otp);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await userRepository.setOtp(user.id, otpHash, expiresAt);

    await processEmailJob({
      to:      user.email,
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
    const user = await userRepository.findByEmail(email);

    if (!user) {
      throw new Error('Invalid or expired code');
    }

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

    await userRepository.clearOtp(user.id);

    const tokens = generateTokens({
      userId: user.id,
      email:  user.email,
      role:   user.role,
    });

    try {
      const emailAllowed = await notificationPreferencesService.isChannelEnabled(
        user.id, 'general', 'email'
      );
      if (emailAllowed) {
        await queueService.enqueue('email', {
          to:      user.email,
          subject: 'New login to your RoleGuard account',
          body:    `<p>Hi ${user.username},</p><p>Your account was just signed in to. If this was you, no action is needed. If you don't recognize this activity, please change your password immediately.</p>`,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to queue login notification:', notifyErr);
    }

    return { user, tokens };
  },

  async refreshToken(userId: string): Promise<AuthTokens> {
    const user = await userRepository.findByIdForAuth(userId);

    if (!user) {
      throw new Error('User not found or inactive');
    }

    return generateTokens({
      userId: user.id,
      email:  user.email,
      role:   user.role,
    });
  },

  async logout(userId: string, pushEndpoint?: string): Promise<void> {
    const user = await userRepository.findUsernameAndEmail(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (pushEndpoint) {
      try {
        await pushSubscriptionService.unsubscribe(userId, pushEndpoint);
      } catch (unsubErr) {
        console.error('Failed to remove push subscription on logout:', unsubErr);
      }
    }

    try {
      const emailAllowed = await notificationPreferencesService.isChannelEnabled(
        userId, 'general', 'email'
      );
      if (emailAllowed) {
        await queueService.enqueue('email', {
          to:      user.email,
          subject: 'You were signed out of RoleGuard',
          body:    `<p>Hi ${user.username},</p><p>You were just signed out of your RoleGuard account. If this wasn't you, someone else may have access — please change your password.</p>`,
        });
      }
    } catch (notifyErr) {
      console.error('Failed to queue logout notification:', notifyErr);
    }
  },

  async getUserById(userId: string): Promise<User> {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('User not found');
    return user;
  },

  async validateEmailExists(email: string): Promise<boolean> {
    return userRepository.existsByEmail(email);
  },

  async validateUsernameExists(username: string): Promise<boolean> {
    return userRepository.existsByUsername(username);
  },
};