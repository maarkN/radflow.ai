import { Global, Module, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import {
  AuditLogModel,
  CreateAuditLogTable1753200000002,
  CreateOutboxTable1753200000001,
  OutboxModel,
  UnitOfWorkTypeOrm,
} from '@radflow/ddd';
import { CreateReportsTable1753300000000 } from '../../core/report/infra/db/typeorm/migrations/1753300000000-create-reports-table';
import { ReportModel } from '../../core/report/infra/db/typeorm/report.model';
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
          entities: [ReportModel, OutboxModel, AuditLogModel],
          migrations: [
            CreateReportsTable1753300000000,
            CreateOutboxTable1753200000001,
            CreateAuditLogTable1753200000002,
          ],
          migrationsRun: true,
          migrationsTableName: 'migrations_dictation',
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
