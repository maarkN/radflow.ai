import { Scope } from '@nestjs/common';
import type { Provider } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SystemClock } from '../../core/shared/domain/clock.interface';
import type { IClock } from '../../core/shared/domain/clock.interface';
import type { IUnitOfWork } from '../../core/shared/domain/repository/unit-of-work.interface';
import { ClaimStudyUseCase } from '../../core/study/application/use-cases/claim-study/claim-study.use-case';
import { CreateStudyUseCase } from '../../core/study/application/use-cases/create-study/create-study.use-case';
import { GetStudyUseCase } from '../../core/study/application/use-cases/get-study/get-study.use-case';
import { ListStudiesUseCase } from '../../core/study/application/use-cases/list-studies/list-studies.use-case';
import { ReleaseStudyUseCase } from '../../core/study/application/use-cases/release-study/release-study.use-case';
import type { IStudyRepository } from '../../core/study/domain/study.repository';
import { StudyTypeOrmRepository } from '../../core/study/infra/db/typeorm/study-typeorm.repository';

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
  GET_STUDY_USE_CASE: {
    provide: GetStudyUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository) => new GetStudyUseCase(repository),
    inject: ['StudyRepository'],
  },
  LIST_STUDIES_USE_CASE: {
    provide: ListStudiesUseCase,
    scope: Scope.REQUEST,
    useFactory: (repository: IStudyRepository) => new ListStudiesUseCase(repository),
    inject: ['StudyRepository'],
  },
};
