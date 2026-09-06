import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import workspaceRoutes from './routes/workspace.routes';
import queueRoutes from './routes/queue.routes';
import notificationRoutes from './routes/notification.routes';
import notificationPreferencesRoutes from './routes/notificationPreferences.routes';
import notificationMuteRoutes from './routes/notificationMute.routes';
import announcementRoutes from './routes/announcement.routes';
import pushSubscriptionRoutes from './routes/pushSubscription.routes';
import dashboardRoutes from './routes/dashboard.routes';
import serviceStatusRoutes from './routes/serviceStatus.routes';
import { startWorker } from './services/worker.service';
import { startScheduler } from './services/scheduler.service';
import { initSocket } from './config/socket';
import { AppError } from './utils/errors';
import { razorpayService } from './services/razorpay.service';
import uploadRoutes from './routes/upload.routes';
import oauthRoutes from './routes/oauth.routes';
import paymentRoutes from './routes/payment.routes';
import healthRoutes from './config/health';
import { env, validateEnv } from './config/env';
import { logger, requestLogger } from './config/logger';


dotenv.config();

// Fail fast in production if required secrets/config are missing, rather
// than starting up in a broken state.
validateEnv();

const app: Express = express();
const httpServer = createServer(app);
const PORT = env.PORT;

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  process.env.CORS_ORIGIN,
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/notification-preferences', notificationPreferencesRoutes);
app.use('/api/notification-mute', notificationMuteRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/push-subscriptions', pushSubscriptionRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/service-status', serviceStatusRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/health', healthRoutes);
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.message, { stack: err.stack, path: req.originalUrl, method: req.method });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
    return;
  }

  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
  });
});

initSocket(httpServer);

httpServer.listen(PORT, () => {
  logger.info(`RoleGuard server started`, {
    port: PORT,
    env: env.NODE_ENV,
    endpoints: {
      health: `/health`,
      liveness: `/health/live`,
      readiness: `/health/ready`,
      auth: `/api/auth`,
      profile: `/api/profile`,
      workspaces: `/api/workspaces`,
      queue: `/api/queue`,
      notifications: `/api/notifications`,
      announcements: `/api/announcements`,
      dashboard: `/api/dashboard`,
      serviceStatus: `/api/service-status`,
      oauth: `/api/auth/oauth/google`,
      payments: `/api/payments`,
    },
  });
  logger.info('Socket.IO real-time collaboration active');
  startWorker();
  startScheduler();
  razorpayService.init().catch((err) => logger.error('Razorpay init failed', { error: err instanceof Error ? err.message : err }));
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: reason instanceof Error ? reason.stack : reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
  if (env.isProduction) {
    process.exit(1);
  }
});