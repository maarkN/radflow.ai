import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DatabaseModule } from './nest/database/database.module';
import { HealthModule } from './nest/health/health.module';
import { MessagingModule } from './nest/messaging/messaging.module';
import { ReportsModule } from './nest/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    MessagingModule,
    HealthModule,
    ReportsModule,
  ],
})
export class AppModule {}
