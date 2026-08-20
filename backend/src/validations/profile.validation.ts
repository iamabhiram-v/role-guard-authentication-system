import { z } from 'zod';
import dns from 'dns/promises';

const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;

const TRUSTED_DOMAINS = [
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'protonmail.com',
  'proton.me',
  'aol.com',
  'zoho.com',
];

const TRUSTED_SET = new Set(TRUSTED_DOMAINS);

/**
 * Standard Levenshtein edit distance between two strings.
 */
const editDistance = (a: string, b: string): number => {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
};

/**
 * If the domain is 1-2 characters off from a well-known provider (but isn't
 * an exact match), it's almost certainly a typo — e.g. "gmadil.com" vs
 * "gmail.com" — even if the typo'd domain happens to be real and resolvable.
 * Returns the likely intended domain, or null if it's not a near-miss.
 */
const findNearMissDomain = (domain: string): string | null => {
  if (TRUSTED_SET.has(domain)) return null; // exact match, not a typo

  for (const trusted of TRUSTED_DOMAINS) {
    // Only compare domains of similar length to avoid false positives
    // against completely unrelated short domains
    if (Math.abs(domain.length - trusted.length) > 2) continue;

    const distance = editDistance(domain, trusted);
    if (distance > 0 && distance <= 2) {
      return trusted;
    }
  }
  return null;
};

/**
 * Checks whether a domain has valid MX (mail exchange) records. Fails OPEN
 * (treats as valid) on timeout/network errors so a flaky network never
 * blocks a real user — only a definitive "domain doesn't exist" rejects.
 */
export const domainCanReceiveMail = async (domain: string): Promise<boolean> => {
  try {
    const records = await Promise.race([
      dns.resolveMx(domain),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('DNS timeout')), 3000)),
    ]);
    return records.length > 0;
  } catch (err: any) {
    if (err.code === 'ENOTFOUND' || err.code === 'ENODATA') return false;
    return true; // fail open on timeouts/other errors
  }
};

/**
 * Full email domain check: catches both "doesn't exist" (MX lookup) and
 * "exists but is almost certainly a typo of a major provider" (edit distance).
 * Returns null if fine, or a human-readable rejection message if not.
 */
export const validateEmailDomain = async (email: string): Promise<string | null> => {
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return 'Invalid email address.';

  if (TRUSTED_SET.has(domain)) return null; // known-good, skip everything else

  const nearMiss = findNearMissDomain(domain);
  if (nearMiss) {
    return `Did you mean @${nearMiss}? "${domain}" looks like a typo.`;
  }

  const canReceive = await domainCanReceiveMail(domain);
  if (!canReceive) {
    return 'This email domain does not appear to accept mail. Please check for typos.';
  }

  return null;
};

const emailSchema = z
  .string()
  .email('Invalid email format')
  .transform((val) => val.toLowerCase().trim());

export const updateProfileSchema = z.object({
  body: z.object({
    username: z.string().min(3).max(30).optional(),
    fullName: z.string().max(100).optional(),
    email: emailSchema.optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    phone: z
      .string()
      .max(20)
      .refine((val) => val === '' || phoneRegex.test(val), {
        message: 'Enter a valid phone number (7–20 digits, may include +, spaces, hyphens, or parentheses)',
      })
      .optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Minimum 8 characters')
      .regex(/[A-Z]/, 'Need an uppercase letter')
      .regex(/[a-z]/, 'Need a lowercase letter')
      .regex(/[0-9]/, 'Need a digit')
      .regex(/[!@#$%^&*]/, 'Need a special character'),
    confirmPassword: z.string(),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
});

export const deleteAccountSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required to delete account'),
    confirmation: z.literal('DELETE', {
      errorMap: () => ({ message: 'Type DELETE to confirm' }),
    }),
  }),
});