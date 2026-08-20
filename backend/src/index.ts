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

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;

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
  console.error(err);

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
  console.log(`✅ RoleGuard Server running on http://localhost:${PORT}`);
  console.log(`📝 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 API: http://localhost:${PORT}/api/auth`);
  console.log(`👤 Profile API: http://localhost:${PORT}/api/profile`);
  console.log(`🏢 Workspace API: http://localhost:${PORT}/api/workspaces`);
  console.log(`📦 Queue API: http://localhost:${PORT}/api/queue`);
  console.log(`🔔 Notifications API: http://localhost:${PORT}/api/notifications`);
  console.log(`⚙️  Notification Preferences API: http://localhost:${PORT}/api/notification-preferences`);
  console.log(`🔇 Notification Mute API: http://localhost:${PORT}/api/notification-mute`);
  console.log(`📣 Announcements API: http://localhost:${PORT}/api/announcements`);
  console.log(`🔕 Push Subscriptions API: http://localhost:${PORT}/api/push-subscriptions`);
  console.log(`📊 Dashboard API: http://localhost:${PORT}/api/dashboard`);
  console.log(`🩺 Service Status API: http://localhost:${PORT}/api/service-status`);
  console.log(`🔐 OAuth API: http://localhost:${PORT}/api/auth/oauth/google`);
  console.log(`💳 Payments API: http://localhost:${PORT}/api/payments`);
  console.log(`🔌 Socket.IO: real-time collaboration active`);
  startWorker();
  startScheduler();
  razorpayService.init().catch((err) => console.error('Razorpay init failed:', err));
});