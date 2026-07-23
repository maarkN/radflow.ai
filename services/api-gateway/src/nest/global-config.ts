import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';

export function applyGlobalConfig(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });
  app.enableCors({ origin: true });
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, errorHttpStatusCode: 422 }),
  );
}
