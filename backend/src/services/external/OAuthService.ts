import { ExternalService } from './baseService';
import { ServiceError } from './errors';
import { ServiceCallResult } from './types';

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

export interface GoogleUserInfo {
  sub: string;        // Google's stable user ID
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
}

interface GitHubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

export interface GitHubUserInfo {
  sub: string;         // GitHub's numeric user ID, stringified
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

interface MicrosoftTokenResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
}

interface MicrosoftUserResponse {
  id: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
}

export interface MicrosoftUserInfo {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
}

export class OAuthService extends ExternalService {
  protected readonly serviceName = 'oauth';

  // ---------- Google (existing, unchanged) ----------

  getGoogleAuthUrl(state?: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw ServiceError.permanent('[oauth] Missing GOOGLE_CLIENT_ID or GOOGLE_REDIRECT_URI');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      access_type: 'offline',
      prompt: 'select_account',
      ...(state ? { state } : {}),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  async exchangeCode(code: string): Promise<ServiceCallResult<GoogleUserInfo>> {
    return this.execute(
      async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = process.env.GOOGLE_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
          throw ServiceError.permanent('[oauth] Missing Google OAuth env vars');
        }

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenRes.ok) {
          const err = (await tokenRes.json().catch(() => ({}))) as any;
          const msg = err.error_description || 'Failed to exchange OAuth code';
          if (tokenRes.status < 500) throw ServiceError.permanent(msg, String(tokenRes.status));
          throw ServiceError.retryable(msg, String(tokenRes.status));
        }

        const tokens = (await tokenRes.json()) as GoogleTokenResponse;

        const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userRes.ok) {
          throw ServiceError.retryable('Failed to fetch Google user info', String(userRes.status));
        }

        const userInfo = (await userRes.json()) as GoogleUserInfo;

        if (!userInfo.email_verified) {
          throw ServiceError.permanent('Google account email is not verified');
        }

        return userInfo;
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );
  }

  // ---------- GitHub ----------

  getGitHubAuthUrl(state?: string): string {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw ServiceError.permanent('[oauth] Missing GITHUB_CLIENT_ID or GITHUB_REDIRECT_URI');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: 'read:user user:email',
      ...(state ? { state } : {}),
    });

    return `https://github.com/login/oauth/authorize?${params}`;
  }

  async exchangeGitHubCode(code: string): Promise<ServiceCallResult<GitHubUserInfo>> {
    return this.execute(
      async () => {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const redirectUri = process.env.GITHUB_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
          throw ServiceError.permanent('[oauth] Missing GitHub OAuth env vars');
        }

        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Accept: 'application/json',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
          }),
        });

        if (!tokenRes.ok) {
          throw ServiceError.retryable('Failed to exchange GitHub OAuth code', String(tokenRes.status));
        }

        const tokenJson = (await tokenRes.json()) as GitHubTokenResponse & { error?: string; error_description?: string };
        if (tokenJson.error) {
          throw ServiceError.permanent(tokenJson.error_description || tokenJson.error);
        }

        const headers = {
          Authorization: `Bearer ${tokenJson.access_token}`,
          Accept: 'application/vnd.github+json',
          'User-Agent': 'RoleGuard-App',
        };

        const userRes = await fetch('https://api.github.com/user', { headers });
        if (!userRes.ok) {
          throw ServiceError.retryable('Failed to fetch GitHub user info', String(userRes.status));
        }
        const ghUser = (await userRes.json()) as GitHubUserResponse;

        // GitHub's /user endpoint omits email if it's private, so a
        // separate call to /user/emails is needed to find the primary,
        // verified address.
        const emailRes = await fetch('https://api.github.com/user/emails', { headers });
        if (!emailRes.ok) {
          throw ServiceError.retryable('Failed to fetch GitHub email', String(emailRes.status));
        }
        const emails = (await emailRes.json()) as GitHubEmailResponse[];
        const primaryEmail = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);

        if (!primaryEmail) {
          throw ServiceError.permanent('GitHub account has no verified email');
        }

        return {
          sub: String(ghUser.id),
          email: primaryEmail.email,
          email_verified: true,
          name: ghUser.name || ghUser.login,
          picture: ghUser.avatar_url,
        };
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );
  }

  // ---------- Microsoft ----------

  getMicrosoftAuthUrl(state?: string): string {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
    const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

    if (!clientId || !redirectUri) {
      throw ServiceError.permanent('[oauth] Missing MICROSOFT_CLIENT_ID or MICROSOFT_REDIRECT_URI');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      response_mode: 'query',
      scope: 'openid email profile User.Read',
      ...(state ? { state } : {}),
    });

    return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params}`;
  }

  async exchangeMicrosoftCode(code: string): Promise<ServiceCallResult<MicrosoftUserInfo>> {
    return this.execute(
      async () => {
        const clientId = process.env.MICROSOFT_CLIENT_ID;
        const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        const redirectUri = process.env.MICROSOFT_REDIRECT_URI;
        const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

        if (!clientId || !clientSecret || !redirectUri) {
          throw ServiceError.permanent('[oauth] Missing Microsoft OAuth env vars');
        }

        const tokenRes = await fetch(
          `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              code,
              client_id: clientId,
              client_secret: clientSecret,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
              scope: 'openid email profile User.Read',
            }),
          }
        );

        if (!tokenRes.ok) {
          const err = (await tokenRes.json().catch(() => ({}))) as any;
          const msg = err.error_description || 'Failed to exchange Microsoft OAuth code';
          if (tokenRes.status < 500) throw ServiceError.permanent(msg, String(tokenRes.status));
          throw ServiceError.retryable(msg, String(tokenRes.status));
        }

        const tokens = (await tokenRes.json()) as MicrosoftTokenResponse;

        const userRes = await fetch('https://graph.microsoft.com/v1.0/me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        });

        if (!userRes.ok) {
          throw ServiceError.retryable('Failed to fetch Microsoft user info', String(userRes.status));
        }

        const msUser = (await userRes.json()) as MicrosoftUserResponse;
        const email = msUser.mail || msUser.userPrincipalName;

        if (!email) {
          throw ServiceError.permanent('Microsoft account has no email');
        }

        return {
          sub: msUser.id,
          email,
          email_verified: true, // Graph doesn't expose this directly; org accounts are pre-verified
          name: msUser.displayName,
          picture: '',
        };
      },
      { maxAttempts: 2, baseDelayMs: 500 }
    );
  }
}

export const oauthService = new OAuthService();