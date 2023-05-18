import { randomUUID } from 'crypto';
import cache from './cache';
import { logger } from './logger';

export type updateFn = (msg: string, status?: string, partialdata?: Record<string, any>) => void;

export default class AsyncTask<T> {
  public readonly id = randomUUID();
  public readonly request: any;
  constructor(task: (updater: updateFn) => Promise<T>, userId: number) {
    this.request = { id: this.id, status: 'pending', userId, results: { message: 'pending' }, partialdata: {} };
    cache.set('qr-' + this.id, JSON.stringify(this.request));
    const updateStatus = (msg: string, status = 'inprogress', partialdata?: Record<string, any>) => {
      this.request.status = status;
      this.request.results = { message: msg };
      this.request.partialdata = partialdata;
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
