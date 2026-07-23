import './tracing';
import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import type { EnvDto } from './config/env.dto';
import { applyGlobalConfig } from './nest/global-config';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  applyGlobalConfig(app);
  app.enableShutdownHooks();

  const env = app.get(ConfigService<EnvDto, true>);
  await app.listen(env.get('PORT', { infer: true }));
}

void bootstrap();
