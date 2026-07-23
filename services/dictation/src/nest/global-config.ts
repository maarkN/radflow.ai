import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import {
  NotFoundErrorFilter,
  ReportConflictFilter,
  UpstreamErrorFilter,
} from './shared/filters/report-errors.filter';
import { WrapperDataInterceptor } from './shared/interceptors/wrapper-data.interceptor';

export function applyGlobalConfig(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, errorHttpStatusCode: 422 }),
  );
  app.useGlobalInterceptors(new WrapperDataInterceptor());
  app.useGlobalFilters(
    new NotFoundErrorFilter(),
    new ReportConflictFilter(),
    new UpstreamErrorFilter(),
  );
}
