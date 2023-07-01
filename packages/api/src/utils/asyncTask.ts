import { randomUUID } from 'crypto';
import cache from './cache';
import { logger } from './logger';
import { log } from 'console';

export type updateFn = (msg: string, status?: string, partialdata?: Record<string, any>) => void;

export default class AsyncTask<T> {
  public readonly id = randomUUID();
  public readonly request: any;
  constructor(task: (updater: updateFn) => Promise<T>, userId: number) {
    this.request = { id: this.id, status: 'pending', userId, results: { message: 'pending' }, partialdata: {} };
    cache.set('qr-' + this.id, JSON.stringify(this.request));
    const updateStatus = (msg: string, status = 'inprogress', partialdata?: Record<string, any>) => {
      try {
        this.request.status = status;
        this.request.results = { message: msg };
        this.request.partialdata = partialdata;
        cache.set('qr-' + this.request.id, JSON.stringify(this.request));
      } catch (ex) {
        logger.debug(`Unable to update status for qr-${this.request.id}, error: ${ex}`);
      }
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
