import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { EventsGateway } from './nest/events/events.gateway';
import { HealthModule } from './nest/health/health.module';
import { StudiesProxyController } from './nest/studies/studies-proxy.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    HealthModule,
  ],
  controllers: [StudiesProxyController],
  providers: [EventsGateway],
})
export class AppModule {}
