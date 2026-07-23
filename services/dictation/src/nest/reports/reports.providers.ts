import { Scope } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SystemClock } from '@radflow/ddd';
import type { IClock, IUnitOfWork } from '@radflow/ddd';
import type { IDraftClient } from '../../core/report/application/ports/draft-client.interface';
import type { IWorklistClient } from '../../core/report/application/ports/worklist-client.interface';
import { AttachTranscriptUseCase } from '../../core/report/application/use-cases/attach-transcript/attach-transcript.use-case';
import { GenerateDraftUseCase } from '../../core/report/application/use-cases/generate-draft/generate-draft.use-case';
import { GetReportUseCase } from '../../core/report/application/use-cases/get-report/get-report.use-case';
import { SignReportUseCase } from '../../core/report/application/use-cases/sign-report/sign-report.use-case';
import { StartReportUseCase } from '../../core/report/application/use-cases/start-report/start-report.use-case';
import { UpdateReportUseCase } from '../../core/report/application/use-cases/update-report/update-report.use-case';
import type { IReportRepository } from '../../core/report/domain/report.repository';
import { ReportTypeOrmRepository } from '../../core/report/infra/db/typeorm/report-typeorm.repository';
import { ReportAiHttpClient } from '../../core/report/infra/http/report-ai-http.client';
import { WorklistHttpClient } from '../../core/report/infra/http/worklist-http.client';
import type { EnvDto } from '../../config/env.dto';

export const REPORT_PROVIDERS: Record<string, Provider> = {
  CLOCK: { provide: 'Clock', useClass: SystemClock },
  DRAFT_CLIENT: {
    provide: 'DraftClient',
    useFactory: (config: ConfigService<EnvDto, true>) =>
      new ReportAiHttpClient(config.get('REPORT_AI_URL', { infer: true })),
    inject: [ConfigService],
  },
  WORKLIST_CLIENT: {
    provide: 'WorklistClient',
    useFactory: (config: ConfigService<EnvDto, true>) =>
      new WorklistHttpClient(config.get('WORKLIST_URL', { infer: true })),
    inject: [ConfigService],
  },
  REPORT_REPOSITORY: {
    provide: 'ReportRepository',
    scope: Scope.REQUEST,
    useFactory: (dataSource: DataSource, unitOfWork: IUnitOfWork) =>
      new ReportTypeOrmRepository(dataSource, unitOfWork),
    inject: [DataSource, 'UnitOfWork'],
  },
  START_REPORT: {
    provide: StartReportUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IReportRepository, unitOfWork: IUnitOfWork) =>
      new StartReportUseCase(repository, unitOfWork),
    inject: ['ReportRepository', 'UnitOfWork'],
  },
  ATTACH_TRANSCRIPT: {
    provide: AttachTranscriptUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IReportRepository, unitOfWork: IUnitOfWork) =>
      new AttachTranscriptUseCase(repository, unitOfWork),
    inject: ['ReportRepository', 'UnitOfWork'],
  },
  GENERATE_DRAFT: {
    provide: GenerateDraftUseCase,
    scope: Scope.REQUEST,
    useFactory: (
      repository: IReportRepository,
      unitOfWork: IUnitOfWork,
      draftClient: IDraftClient,
      worklistClient: IWorklistClient,
    ) => new GenerateDraftUseCase(repository, unitOfWork, draftClient, worklistClient),
    inject: ['ReportRepository', 'UnitOfWork', 'DraftClient', 'WorklistClient'],
  },
  UPDATE_REPORT: {
    provide: UpdateReportUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IReportRepository, unitOfWork: IUnitOfWork) =>
      new UpdateReportUseCase(repository, unitOfWork),
    inject: ['ReportRepository', 'UnitOfWork'],
  },
  SIGN_REPORT: {
    provide: SignReportUseCase,
    scope: Scope.REQUEST,
    useFactory: (
      repository: IReportRepository,
      unitOfWork: IUnitOfWork,
      worklistClient: IWorklistClient,
      clock: IClock,
    ) => new SignReportUseCase(repository, unitOfWork, worklistClient, clock),
    inject: ['ReportRepository', 'UnitOfWork', 'WorklistClient', 'Clock'],
  },
  GET_REPORT: {
    provide: GetReportUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IReportRepository) => new GetReportUseCase(repository),
    inject: ['ReportRepository'],
  },
};
