import dotenv from 'dotenv';

// Loads .env.<NODE_ENV> first if it exists (e.g. .env.production), falling
// back to plain .env — lets you keep separate files per environment
// without changing any code, only which file is present/deployed.
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : '.env';
dotenv.config({ path: envFile });
dotenv.config(); // fallback/merge with plain .env for anything envFile didn't set

const REQUIRED_IN_PRODUCTION = [
  'DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'JWT_SECRET', 'JWT_REFRESH_SECRET',
  'REDIS_HOST',
];

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV !== 'production',
  PORT: Number(process.env.PORT) || 3000,
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
};

// Fail fast on boot in production rather than limping along with an
// undefined JWT secret or DB password — that's a much worse failure
// mode to discover at 2am from a stack trace than at deploy time.
export function validateEnv(): void {
  if (!env.isProduction) return;

  const missing = REQUIRED_IN_PRODUCTION.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`❌ Missing required environment variables in production: ${missing.join(', ')}`);
    process.exit(1);
  }
}