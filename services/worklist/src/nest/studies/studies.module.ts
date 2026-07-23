import { Module } from '@nestjs/common';
import { StudiesController } from './studies.controller';
import { STUDY_PROVIDERS } from './studies.providers';

@Module({
  controllers: [StudiesController],
  providers: Object.values(STUDY_PROVIDERS),
})
export class StudiesModule {}
