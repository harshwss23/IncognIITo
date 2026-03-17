import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

redisClient.on('error', (err: unknown) => {
  console.error('Redis error:', err);
});

redisClient.on('connect', () => {
  console.log('Redis connected');
});

// Connect immediately when this module is imported
redisClient.connect().catch((err: unknown) => {
  console.error('Redis failed to connect:', err);
});

export default redisClient;
