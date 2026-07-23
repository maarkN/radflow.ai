import { Injectable } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Wraps responses in { data }; health stays raw for probes. */
@Injectable()
export class WrapperDataInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<{ url: string }>();
    return next.handle().pipe(
      map((body) => {
        if (request.url.startsWith('/health')) {
          return body;
        }
        return { data: body };
      }),
    );
  }
}
