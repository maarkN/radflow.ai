import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DicomProxyController, Hl7ProxyController } from './nest/dicom/dicom-proxy.controller';
import { EventsGateway } from './nest/events/events.gateway';
import { HealthModule } from './nest/health/health.module';
import { ReportsProxyController } from './nest/reports/reports-proxy.controller';
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
  controllers: [
    StudiesProxyController,
    DicomProxyController,
    Hl7ProxyController,
    ReportsProxyController,
  ],
  providers: [EventsGateway],
})
export class AppModule {}
