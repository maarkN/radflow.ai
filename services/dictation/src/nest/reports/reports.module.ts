import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { REPORT_PROVIDERS } from './reports.providers';

@Module({
  controllers: [ReportsController],
  providers: Object.values(REPORT_PROVIDERS),
})
export class ReportsModule {}
