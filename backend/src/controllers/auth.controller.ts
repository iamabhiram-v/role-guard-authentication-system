import { Request, Response } from 'express';
import { ZodError } from 'zod';
import { userService } from '../services/auth.service';
import { AuthRequest } from '../middleware/auth.middleware';
import { registerSchema, loginSchema } from '../validations/auth.validation';
import { otpSchema } from '../validations/auth.validation';
import { verifyRefreshToken } from '../utils/jwt';

// Cross-domain cookies (Vercel frontend + Render backend) require
// sameSite: 'none' paired with secure: true. In local dev, frontend and
// backend are both on localhost (same-site, different ports), so 'strict'
// works fine there. isProd drives both together since 'none' is rejected
// by browsers unless the cookie is also marked secure.
const isProd = process.env.NODE_ENV === 'production';
const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'strict') as 'none' | 'strict',
};

const formatValidationError = (error: ZodError) => {
  return error.issues.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
};

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const validatedData = registerSchema.parse(req.body);
      const { user, tokens } = await userService.register(validatedData);

      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieBase,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });
      res.cookie('accessToken', tokens.accessToken, {
        ...cookieBase,
        maxAge: 15 * 60 * 1000,
      });

      // SECURITY: tokens are NOT included in the response body.
      // They live only in httpOnly cookies, inaccessible to JS.
      return res.status(201).json({
        status: 'success',
        message: 'Registration successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          },
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: formatValidationError(error),
        });
      }

      const message = error instanceof Error ? error.message : 'Registration failed';

      if (message.includes('already in use')) {
        return res.status(409).json({
          status: 'error',
          message: 'Email or username already in use',
        });
      }

      return res.status(500).json({ status: 'error', message });
    }
  },

  // Step 1 of login: verify email/password.
  // If 2FA is disabled, tokens are issued immediately.
  // If 2FA is enabled, an OTP is emailed and tokens are only issued after /verify-otp.
  async login(req: Request, res: Response) {
    try {
      const validatedData = loginSchema.parse(req.body);
      const result = await userService.login(validatedData);

      if (!result.requiresOtp) {
        res.cookie('refreshToken', result.tokens.refreshToken, {
          ...cookieBase,
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/api/auth/refresh',
        });
        res.cookie('accessToken', result.tokens.accessToken, {
          ...cookieBase,
          maxAge: 15 * 60 * 1000,
        });
        return res.status(200).json({
          status: 'success',
          message: 'Login successful',
          data: {
            requiresOtp: false,
            user: {
              id: result.user.id,
              email: result.user.email,
              username: result.user.username,
              role: result.user.role,
            },
          },
        });
      }

      return res.status(200).json({
        status: 'success',
        message: 'Verification code sent to your email',
        data: { requiresOtp: true, email: result.email },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: formatValidationError(error),
        });
      }
      return res.status(401).json({ status: 'error', message: 'Invalid email or password' });
    }
  },

  // Step 2 of login: verify the OTP, then issue tokens exactly as the old /login did.
  async verifyOtp(req: Request, res: Response) {
    try {
      const { email, code } = otpSchema.parse(req.body);
      const { user, tokens } = await userService.verifyOtp(email, code);

      res.cookie('refreshToken', tokens.refreshToken, {
        ...cookieBase,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/api/auth/refresh',
      });
      res.cookie('accessToken', tokens.accessToken, {
        ...cookieBase,
        maxAge: 15 * 60 * 1000,
      });

      return res.status(200).json({
        status: 'success',
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role,
          },
        },
      });
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Validation failed',
          errors: formatValidationError(error),
        });
      }
      const message = error instanceof Error ? error.message : 'Verification failed';
      return res.status(401).json({ status: 'error', message });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const cookieToken = req.cookies?.refreshToken;
      if (!cookieToken) {
        return res.status(401).json({ status: 'error', message: 'Refresh token required' });
      }

      let decoded;
      try {
        decoded = verifyRefreshToken(cookieToken);
      } catch {
        return res.status(401).json({ status: 'error', message: 'Invalid or expired refresh token' });
      }

      const tokens = await userService.refreshToken(decoded.userId);

      res.cookie('accessToken', tokens.accessToken, {
        ...cookieBase,
        maxAge: 15 * 60 * 1000,
      });

      // SECURITY: no tokens in the response body — the cookie is already set.
      return res.status(200).json({ status: 'success', message: 'Token refreshed' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token refresh failed';
      return res.status(401).json({ status: 'error', message });
    }
  },

  async logout(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Authentication required' });
      }

      const { pushEndpoint } = req.body ?? {};
      await userService.logout(req.user.userId, pushEndpoint);

      res.clearCookie('accessToken', cookieBase);
      res.clearCookie('refreshToken', { ...cookieBase, path: '/api/auth/refresh' });

      return res.status(200).json({ status: 'success', message: 'Logout successful' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      return res.status(500).json({ status: 'error', message });
    }
  },

  async me(req: AuthRequest, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({ status: 'error', message: 'Authentication required' });
      }

      const user = await userService.getUserById(req.user.userId);

      return res.status(200).json({
        status: 'success',
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: user.role,
          isActive: user.is_active,
          lastLogin: user.last_login,
          twoFaEnabled: user.two_fa_enabled,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch user';
      return res.status(500).json({ status: 'error', message });
    }
  },
};