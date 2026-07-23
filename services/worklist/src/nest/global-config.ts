import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DomainConflictFilter } from './shared/filters/domain-conflict.filter';
import { EntityValidationErrorFilter } from './shared/filters/entity-validation-error.filter';
import { NotFoundErrorFilter } from './shared/filters/not-found-error.filter';
import { WrapperDataInterceptor } from './shared/interceptors/wrapper-data.interceptor';

export function applyGlobalConfig(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, errorHttpStatusCode: 422 }),
  );
  app.useGlobalInterceptors(
    new WrapperDataInterceptor(),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(
    new NotFoundErrorFilter(),
    new EntityValidationErrorFilter(),
    new DomainConflictFilter(),
  );
}
