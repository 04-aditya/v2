import Redis from 'ioredis';

export const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt('' + (process.env.REDIS_PORT || 6379)),
  password: process.env.REDIS_PASSWORD,
  db: 0,
};

export const redisInstance = new Redis(redisOptions);

redisInstance.on('error', error => {
  console.error(error);
});
