import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { DicomModule } from './nest/dicom/dicom.module';
import { HealthModule } from './nest/health/health.module';
import { MllpModule } from './nest/mllp/mllp.module';
import { OruModule } from './nest/oru/oru.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    HealthModule,
    MllpModule,
    OruModule,
    DicomModule,
  ],
})
export class AppModule {}
