import { Middleware, ExpressErrorMiddlewareInterface, HttpError } from 'routing-controllers';

@Middleware({ type: 'after' })
export class HttpErrorHandler implements ExpressErrorMiddlewareInterface {
  error(error: any, _request: any, response: any, next: (err: any) => any) {
    if (error instanceof HttpError) {
      return response.status(error.httpCode).json(error);
    }
    next(error);
  }
}
