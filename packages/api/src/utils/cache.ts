import cacheManager from 'cache-manager';
import redisStore from 'cache-manager-ioredis';
import { redisInstance } from './redisInstance';

const memoryCache = cacheManager.caching({ store: 'memory', max: 100, ttl: 10 /*seconds*/ });

const redisCache = cacheManager.caching({
  store: redisStore,
  redisInstance: redisInstance,
  ttl: 600,
});

const cache = process.env.NODE_ENV === 'production' ? cacheManager.multiCaching([redisCache]) : cacheManager.multiCaching([memoryCache, redisCache]);

export default cache;
