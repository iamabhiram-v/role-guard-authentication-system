import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { env } from './env';

// In production, write to rotating-by-date files under logs/ AND stdout
// (containers/hosting platforms like Render capture stdout automatically,
// but a local file also survives container restarts if a volume is
// mounted). In development, just colorized console output — no reason
// to write log files during local dev.
const logsDir = path.join(process.cwd(), 'logs');
if (env.isProduction && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${metaStr}`;
  })
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.isProduction ? prodFormat : devFormat,
  transports: [
    new winston.transports.Console(),
    ...(env.isProduction
      ? [
          new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
          new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
        ]
      : []),
  ],
  // Never let logging itself crash the process — an unhandled exception
  // while trying to log an unhandled exception is a bad time.
  exitOnError: false,
});

// Express middleware — logs every request with method, path, status, and
// duration. Placed after body parsing so it doesn't slow down responses.
import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';
    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs}ms`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });
  next();
}