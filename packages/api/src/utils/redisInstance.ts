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

async function _getCardinality(key) {
  return redisInstance.zcard(key);
}

//to prevent same millisecond increments
function makeid(timems) {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 5; i++) text += possible.charAt(Math.floor(Math.random() * possible.length));

  return timems + text;
}

export const SlidingCounter = {
  increment: async function (key, windowInSeconds) {
    const now = new Date().getTime();
    const expires = now - windowInSeconds * 1000;

    return redisInstance
      .multi([
        ['zremrangebyscore', key, '-inf', expires],
        ['zadd', key, now, makeid(now)],
        ['expire', key, '86400'], //1 day
      ])
      .exec();
  },
  count: async function (key) {
    return _getCardinality(key);
  },
};
