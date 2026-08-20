import { Router, Request, Response } from 'express';
import { oauthService } from '../services/external/OAuthService';
import { db } from '../config/database';
import { generateTokens } from '../utils/jwt';

const router = Router();

const isProd = process.env.NODE_ENV === 'production';
const cookieBase = {
  httpOnly: true,
  secure: isProd,
  sameSite: (isProd ? 'none' : 'strict') as 'none' | 'strict',
};

async function findOrCreateOAuthUser(email: string, name: string, providerId: string) {
  const existing = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    return existing.rows[0];
  }

  const username = name.replace(/\s+/g, '_').toLowerCase().slice(0, 30) + '_' + providerId.slice(-4);
  const inserted = await db.query(
    `INSERT INTO users (email, username, password_hash, role, is_active, created_at, updated_at)
     VALUES ($1, $2, $3, 'user', true, NOW(), NOW())
     RETURNING *`,
    [email, username, ''] // empty password_hash — OAuth users can't use password login
  );
  return inserted.rows[0];
}

function issueSessionAndRedirect(res: Response, user: any) {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';
  const tokens = generateTokens({ userId: user.id, email: user.email, role: user.role });

  res.cookie('refreshToken', tokens.refreshToken, {
    ...cookieBase,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
  res.cookie('accessToken', tokens.accessToken, { ...cookieBase, maxAge: 15 * 60 * 1000 });

  res.redirect(`${frontendBase}/dashboard`);
}

// ---------- Google (existing, unchanged) ----------

router.get('/google', (req: Request, res: Response) => {
  try {
    const url = oauthService.getGoogleAuthUrl();
    res.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth unavailable';
    res.status(503).json({ status: 'error', message: msg });
  }
});

router.get('/google/callback', async (req: Request, res: Response) => {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.redirect(`${frontendBase}/login?error=oauth_cancelled`);
    }

    const result = await oauthService.exchangeCode(code);
    if (!result.success || !result.data) {
      return res.redirect(`${frontendBase}/login?error=oauth_failed`);
    }

    const { email, name, sub } = result.data;
    const user = await findOrCreateOAuthUser(email, name, sub);
    issueSessionAndRedirect(res, user);
  } catch (err) {
    console.error('Google OAuth callback error:', err);
    res.redirect(`${frontendBase}/login?error=oauth_error`);
  }
});

// ---------- GitHub ----------

router.get('/github', (req: Request, res: Response) => {
  try {
    const url = oauthService.getGitHubAuthUrl();
    res.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth unavailable';
    res.status(503).json({ status: 'error', message: msg });
  }
});

router.get('/github/callback', async (req: Request, res: Response) => {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.redirect(`${frontendBase}/login?error=oauth_cancelled`);
    }

    const result = await oauthService.exchangeGitHubCode(code);
    if (!result.success || !result.data) {
      return res.redirect(`${frontendBase}/login?error=oauth_failed`);
    }

    const { email, name, sub } = result.data;
    const user = await findOrCreateOAuthUser(email, name, sub);
    issueSessionAndRedirect(res, user);
  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    res.redirect(`${frontendBase}/login?error=oauth_error`);
  }
});

// ---------- Microsoft ----------

router.get('/microsoft', (req: Request, res: Response) => {
  try {
    const url = oauthService.getMicrosoftAuthUrl();
    res.redirect(url);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'OAuth unavailable';
    res.status(503).json({ status: 'error', message: msg });
  }
});

router.get('/microsoft/callback', async (req: Request, res: Response) => {
  const frontendBase = process.env.FRONTEND_URL || 'http://localhost:5173';

  try {
    const code = req.query.code as string | undefined;
    if (!code) {
      return res.redirect(`${frontendBase}/login?error=oauth_cancelled`);
    }

    const result = await oauthService.exchangeMicrosoftCode(code);
    if (!result.success || !result.data) {
      return res.redirect(`${frontendBase}/login?error=oauth_failed`);
    }

    const { email, name, sub } = result.data;
    const user = await findOrCreateOAuthUser(email, name, sub);
    issueSessionAndRedirect(res, user);
  } catch (err) {
    console.error('Microsoft OAuth callback error:', err);
    res.redirect(`${frontendBase}/login?error=oauth_error`);
  }
});

export default router;