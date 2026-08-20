import cron from 'node-cron';
import { queueService } from './queue.service';
import { db } from '../config/database';

export const startScheduler = () => {
  
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running scheduled cleanup task');
    await db.query(
      `DELETE FROM jobs WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days'`
    );
  });

  
  cron.schedule('0 9 * * *', async () => {
    console.log('📧 Enqueueing daily digest emails');
    const users = await db.query(`SELECT email, username FROM users WHERE is_active = true`);
    for (const user of users.rows) {
      await queueService.enqueue('email', {
        to: user.email,
        subject: 'Your Daily Digest',
        body: `<p>Hi ${user.username}, here's your daily summary.</p>`,
      });
    }
  });

  console.log('⏰ Scheduled tasks registered');
};