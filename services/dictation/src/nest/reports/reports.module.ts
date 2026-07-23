import { Module } from '@nestjs/common';
import { AuditController } from '../audit/audit.controller';
import { ReportsController } from './reports.controller';
import { REPORT_PROVIDERS } from './reports.providers';

@Module({
  controllers: [ReportsController, AuditController],
  providers: Object.values(REPORT_PROVIDERS),
})
export class ReportsModule {}
