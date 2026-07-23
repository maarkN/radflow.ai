import type { DataSource, EntityManager } from 'typeorm';
import { ConcurrencyError } from '../../../../shared/domain/errors/concurrency.error';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import type { IUnitOfWork } from '../../../../shared/domain/repository/unit-of-work.interface';
import { Study } from '../../../domain/study.aggregate';
import {
  DuplicatedAccessionNumberError,
  type IStudyRepository,
  type StudyFilter,
  StudySearchParams,
  StudySearchResult,
} from '../../../domain/study.repository';
import type { StudyId } from '../../../domain/value-objects/ids.vo';
import { StudyModelMapper } from './study-model.mapper';
import { StudyModel } from './study.model';

const PG_UNIQUE_VIOLATION = '23505';

const SORT_COLUMNS: Record<string, string> = {
  priority: 'priority',
  slaDeadline: 'sla_deadline',
  orderedAt: 'ordered_at',
};

const PRIORITY_RANK_SQL = `CASE model.priority WHEN 'stat' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END`;

export class StudyTypeOrmRepository implements IStudyRepository {
  sortableFields = ['priority', 'slaDeadline', 'orderedAt'];

  constructor(
    private readonly dataSource: DataSource,
    private readonly unitOfWork?: IUnitOfWork,
  ) {}

  private get manager(): EntityManager {
    const transaction = this.unitOfWork?.getTransaction() as EntityManager | null | undefined;
    return transaction ?? this.dataSource.manager;
  }

  async insert(aggregate: Study): Promise<void> {
    try {
      await this.manager.getRepository(StudyModel).insert(StudyModelMapper.toModel(aggregate));
    } catch (error) {
      if ((error as { driverError?: { code?: string } }).driverError?.code === PG_UNIQUE_VIOLATION) {
        throw new DuplicatedAccessionNumberError(aggregate.accessionNumber);
      }
      throw error;
    }
  }

  /** Optimistic lock: the UPDATE only applies when the stored version matches. */
  async update(aggregate: Study): Promise<void> {
    const model = StudyModelMapper.toModel(aggregate);
    const result = await this.manager
      .createQueryBuilder()
      .update(StudyModel)
      .set({
        priority: model.priority,
        status: model.status,
        assignedTo: model.assignedTo,
        reportId: model.reportId,
        version: () => 'version + 1',
      })
      .where('study_id = :studyId AND version = :version', {
        studyId: model.studyId,
        version: aggregate.version,
      })
      .execute();

    if (result.affected === 0) {
      const exists = await this.manager
        .getRepository(StudyModel)
        .existsBy({ studyId: model.studyId });
      if (!exists) {
        throw new NotFoundError(model.studyId, Study);
      }
      throw new ConcurrencyError(Study.name, model.studyId);
    }
    aggregate.version += 1;
  }

  async findById(id: StudyId): Promise<Study | null> {
    const model = await this.manager.getRepository(StudyModel).findOneBy({ studyId: id.id });
    return model ? StudyModelMapper.toEntity(model) : null;
  }

  async findByAccessionNumber(accessionNumber: string): Promise<Study | null> {
    const model = await this.manager.getRepository(StudyModel).findOneBy({ accessionNumber });
    return model ? StudyModelMapper.toEntity(model) : null;
  }

  async search(params: StudySearchParams): Promise<StudySearchResult> {
    const query = this.manager
      .getRepository(StudyModel)
      .createQueryBuilder('model')
      .skip((params.page - 1) * params.perPage)
      .take(params.perPage);

    this.applyFilter(query, params.filter);

    const sortColumn = params.sort ? SORT_COLUMNS[params.sort] : undefined;
    if (sortColumn) {
      const direction = params.sortDir === 'desc' ? 'DESC' : 'ASC';
      if (params.sort === 'priority') {
        query.orderBy(PRIORITY_RANK_SQL, direction);
      } else {
        query.orderBy(`model.${sortColumn}`, direction);
      }
    } else {
      query.orderBy(PRIORITY_RANK_SQL, 'ASC').addOrderBy('model.sla_deadline', 'ASC');
    }

    const [models, total] = await query.getManyAndCount();
    return new StudySearchResult({
      items: models.map((model) => StudyModelMapper.toEntity(model)),
      total,
      currentPage: params.page,
      perPage: params.perPage,
    });
  }

  getEntity(): new (...args: never[]) => Study {
    return Study;
  }

  private applyFilter(
    query: ReturnType<EntityManager['createQueryBuilder']>,
    filter: StudyFilter | null,
  ): void {
    if (!filter) {
      return;
    }
    if (filter.status) {
      query.andWhere('model.status = :status', { status: filter.status });
    }
    if (filter.modality) {
      query.andWhere('model.modality = :modality', { modality: filter.modality });
    }
    if (filter.priority) {
      query.andWhere('model.priority = :priority', { priority: filter.priority });
    }
    if (filter.assignedTo) {
      query.andWhere('model.assigned_to = :assignedTo', { assignedTo: filter.assignedTo });
    }
  }
}
