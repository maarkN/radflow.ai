import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { validateEnv } from './config/env.validation';
import type { EnvDto } from './config/env.dto';
import { AuditProxyController } from './nest/audit/audit-proxy.controller';
import { AuthController } from './nest/auth/auth.controller';
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
    JwtModule.registerAsync({
      global: true,
      useFactory: (config: ConfigService<EnvDto, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '12h' },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
  ],
  controllers: [
    AuthController,
    StudiesProxyController,
    DicomProxyController,
    Hl7ProxyController,
    ReportsProxyController,
    AuditProxyController,
  ],
  providers: [EventsGateway],
})
export class AppModule {}
