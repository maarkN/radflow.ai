import { Module } from '@nestjs/common';
import { AuditController } from '../audit/audit.controller';
import { StudiesController } from './studies.controller';
import { STUDY_PROVIDERS } from './studies.providers';

@Module({
  controllers: [StudiesController, AuditController],
  providers: Object.values(STUDY_PROVIDERS),
})
export class StudiesModule {}
