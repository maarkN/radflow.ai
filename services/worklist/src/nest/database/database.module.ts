import { Global, Module, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { UnitOfWorkTypeOrm } from '@radflow/ddd';
import { OutboxModel } from '@radflow/ddd';
import { CreateOutboxTable1753200000001 } from '@radflow/ddd';
import { StudyModel } from '../../core/study/infra/db/typeorm/study.model';
import { CreateStudiesTable1753200000000 } from '../../core/study/infra/db/typeorm/migrations/1753200000000-create-studies-table';
import type { EnvDto } from '../../config/env.dto';

@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: async (config: ConfigService<EnvDto, true>) => {
        const dataSource = new DataSource({
          type: 'postgres',
          url: config.get('DATABASE_URL', { infer: true }),
          entities: [StudyModel, OutboxModel],
          migrations: [CreateStudiesTable1753200000000, CreateOutboxTable1753200000001],
          migrationsRun: true,
          synchronize: false,
          logging: false,
        });
        return dataSource.initialize();
      },
      inject: [ConfigService],
    },
    {
      provide: 'UnitOfWork',
      scope: Scope.REQUEST,
      useFactory: (dataSource: DataSource) => new UnitOfWorkTypeOrm(dataSource),
      inject: [DataSource],
    },
  ],
  exports: [DataSource, 'UnitOfWork'],
})
export class DatabaseModule {}
