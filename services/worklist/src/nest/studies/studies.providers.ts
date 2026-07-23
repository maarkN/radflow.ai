import { Scope } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SystemClock } from '@radflow/ddd';
import type { IClock } from '@radflow/ddd';
import type { IUnitOfWork } from '@radflow/ddd';
import { ClaimStudyUseCase } from '../../core/study/application/use-cases/claim-study/claim-study.use-case';
import { CreateStudyUseCase } from '../../core/study/application/use-cases/create-study/create-study.use-case';
import { GetStudyUseCase } from '../../core/study/application/use-cases/get-study/get-study.use-case';
import { ListStudiesUseCase } from '../../core/study/application/use-cases/list-studies/list-studies.use-case';
import { MarkDictatedUseCase } from '../../core/study/application/use-cases/mark-dictated/mark-dictated.use-case';
import { ReleaseStudyUseCase } from '../../core/study/application/use-cases/release-study/release-study.use-case';
import { SignStudyUseCase } from '../../core/study/application/use-cases/sign-study/sign-study.use-case';
import type { IStudyRepository } from '../../core/study/domain/study.repository';
import { StudyTypeOrmRepository } from '../../core/study/infra/db/typeorm/study-typeorm.repository';
import { WorklistStatsTypeOrmQuery } from '../../core/study/infra/db/typeorm/worklist-stats-typeorm.query';

export const STUDY_PROVIDERS: Record<string, Provider> = {
  CLOCK: {
    provide: 'Clock',
    useClass: SystemClock,
  },
  STUDY_REPOSITORY: {
    provide: 'StudyRepository',
    scope: Scope.REQUEST,
    useFactory: (dataSource: DataSource, unitOfWork: IUnitOfWork) =>
      new StudyTypeOrmRepository(dataSource, unitOfWork),
    inject: [DataSource, 'UnitOfWork'],
  },
  CREATE_STUDY_USE_CASE: {
    provide: CreateStudyUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository, unitOfWork: IUnitOfWork, clock: IClock) =>
      new CreateStudyUseCase(repository, unitOfWork, clock),
    inject: ['StudyRepository', 'UnitOfWork', 'Clock'],
  },
  CLAIM_STUDY_USE_CASE: {
    provide: ClaimStudyUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository, unitOfWork: IUnitOfWork) =>
      new ClaimStudyUseCase(repository, unitOfWork),
    inject: ['StudyRepository', 'UnitOfWork'],
  },
  RELEASE_STUDY_USE_CASE: {
    provide: ReleaseStudyUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository, unitOfWork: IUnitOfWork) =>
      new ReleaseStudyUseCase(repository, unitOfWork),
    inject: ['StudyRepository', 'UnitOfWork'],
  },
  MARK_DICTATED_USE_CASE: {
    provide: MarkDictatedUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository, unitOfWork: IUnitOfWork) =>
      new MarkDictatedUseCase(repository, unitOfWork),
    inject: ['StudyRepository', 'UnitOfWork'],
  },
  SIGN_STUDY_USE_CASE: {
    provide: SignStudyUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository, unitOfWork: IUnitOfWork) =>
      new SignStudyUseCase(repository, unitOfWork),
    inject: ['StudyRepository', 'UnitOfWork'],
  },
  GET_STUDY_USE_CASE: {
    provide: GetStudyUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository) => new GetStudyUseCase(repository),
    inject: ['StudyRepository'],
  },
  WORKLIST_STATS_QUERY: {
    provide: 'WorklistStatsQuery',
    useFactory: (dataSource: DataSource) => new WorklistStatsTypeOrmQuery(dataSource),
    inject: [DataSource],
  },
  LIST_STUDIES_USE_CASE: {
    provide: ListStudiesUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository) => new ListStudiesUseCase(repository),
    inject: ['StudyRepository'],
  },
};
