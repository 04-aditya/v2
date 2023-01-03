import { randomUUID } from 'crypto';
import cache from './cache';
import { logger } from './logger';

export default class AsyncTask<T> {
  public readonly id = randomUUID();
  constructor(task: Promise<T>, userId: string | number) {
    const request: any = { id: this.id, status: 'pending', userId, results: undefined };
    cache.set('qr-' + this.id, JSON.stringify(request));
    task
      .then(results => {
        request.status = 'done';
        request.results = results;
        cache.set('qr-' + request.id, JSON.stringify(request));
      })
      .catch(ex => {
        request.status = 'error';
        request.results = { error: ex.message || ex };
        cache.set('qr-' + request.id, JSON.stringify(request));
        logger.error(ex.message || ex);
      });
  }
}
