import './tracing';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { EnvDto } from './config/env.dto';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({ transform: true, whitelist: true, errorHttpStatusCode: 422 }),
  );
  app.enableShutdownHooks();

  const env = app.get(ConfigService<EnvDto, true>);
  await app.listen(env.get('PORT', { infer: true }));
}

void bootstrap();
