import { randomUUID } from 'crypto';
import cache from './cache';
import { logger } from './logger';

export type stringFn = (msg: string) => void;

export default class AsyncTask<T> {
  public readonly id = randomUUID();
  public readonly request: any;
  constructor(task: (updater: stringFn) => Promise<T>, userId: number) {
    this.request = { id: this.id, status: 'pending', userId, results: { message: 'pending' } };
    cache.set('qr-' + this.id, JSON.stringify(this.request));
    const updateStatus = (msg: string) => {
      this.request.status = 'inprogress';
      this.request.results = { message: msg };
      cache.set('qr-' + this.request.id, JSON.stringify(this.request));
    };

    task(updateStatus)
      .then(results => {
        this.request.status = 'done';
        this.request.results = results;
        cache.set('qr-' + this.request.id, JSON.stringify(this.request));
      })
      .catch(ex => {
        this.request.status = 'error';
        this.request.results = { error: ex.message || ex };
        cache.set('qr-' + this.request.id, JSON.stringify(this.request));
        logger.error(ex.message || ex);
      });
  }
}
