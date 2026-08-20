import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from './redis';

export const jobQueue = new Queue('roleguard-jobs', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

export const jobQueueEvents = new QueueEvents('roleguard-jobs', {
  connection: redisConnection,
});