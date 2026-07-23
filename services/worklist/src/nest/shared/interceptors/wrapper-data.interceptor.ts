import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Wraps responses in { data } — collections already carry { data, meta } and health stays raw. */
@Injectable()
export class WrapperDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url: string }>();
    return next.handle().pipe(
      map((body) => {
        if (request.url.startsWith('/health')) {
          return body;
        }
        if (body && typeof body === 'object' && 'meta' in body) {
          return body;
        }
        return { data: body };
      }),
    );
  }
}
