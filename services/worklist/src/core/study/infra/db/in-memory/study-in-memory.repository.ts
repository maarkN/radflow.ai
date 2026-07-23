import { ConcurrencyError } from '../../../../shared/domain/errors/concurrency.error';
import { NotFoundError } from '../../../../shared/domain/errors/not-found.error';
import { Study } from '../../../domain/study.aggregate';
import {
  DuplicatedAccessionNumberError,
  type IStudyRepository,
  type StudyFilter,
  StudySearchParams,
  StudySearchResult,
} from '../../../domain/study.repository';
import type { StudyId } from '../../../domain/value-objects/ids.vo';

const PRIORITY_RANK: Record<string, number> = { stat: 0, urgent: 1, routine: 2 };

export class StudyInMemoryRepository implements IStudyRepository {
  sortableFields = ['priority', 'slaDeadline', 'orderedAt'];

  private items = new Map<string, Study>();

  async insert(aggregate: Study): Promise<void> {
    const duplicated = await this.findByAccessionNumber(aggregate.accessionNumber);
    if (duplicated) {
      throw new DuplicatedAccessionNumberError(aggregate.accessionNumber);
    }
    this.items.set(aggregate.studyId.id, this.clone(aggregate));
  }

  async update(aggregate: Study): Promise<void> {
    const stored = this.items.get(aggregate.studyId.id);
    if (!stored) {
      throw new NotFoundError(aggregate.studyId.id, Study);
    }
    if (stored.version !== aggregate.version) {
      throw new ConcurrencyError(Study.name, aggregate.studyId.id);
    }
    aggregate.version += 1;
    this.items.set(aggregate.studyId.id, this.clone(aggregate));
  }

  async findById(id: StudyId): Promise<Study | null> {
    const stored = this.items.get(id.id);
    return stored ? this.clone(stored) : null;
  }

  async findByAccessionNumber(accessionNumber: string): Promise<Study | null> {
    for (const study of this.items.values()) {
      if (study.accessionNumber === accessionNumber) {
        return this.clone(study);
      }
    }
    return null;
  }

  async search(params: StudySearchParams): Promise<StudySearchResult> {
    const filtered = this.applyFilter([...this.items.values()], params.filter);
    const sorted = this.applySort(filtered, params);
    const start = (params.page - 1) * params.perPage;
    const paginated = sorted.slice(start, start + params.perPage).map((study) => this.clone(study));
    return new StudySearchResult({
      items: paginated,
      total: filtered.length,
      currentPage: params.page,
      perPage: params.perPage,
    });
  }

  getEntity(): new (...args: never[]) => Study {
    return Study;
  }

  private applyFilter(items: Study[], filter: StudyFilter | null): Study[] {
    if (!filter) {
      return items;
    }
    return items.filter(
      (study) =>
        (!filter.status || study.status === filter.status) &&
        (!filter.modality || study.modality === filter.modality) &&
        (!filter.priority || study.priority === filter.priority) &&
        (!filter.assignedTo || study.assignedTo?.id === filter.assignedTo),
    );
  }

  /** Default worklist order: highest priority first, then earliest SLA deadline. */
  private applySort(items: Study[], params: StudySearchParams): Study[] {
    if (params.sort && this.sortableFields.includes(params.sort)) {
      const direction = params.sortDir === 'desc' ? -1 : 1;
      const sort = params.sort as 'priority' | 'slaDeadline' | 'orderedAt';
      return [...items].sort((a, b) => {
        const left = sort === 'priority' ? (PRIORITY_RANK[a.priority] ?? 99) : a[sort].getTime();
        const right = sort === 'priority' ? (PRIORITY_RANK[b.priority] ?? 99) : b[sort].getTime();
        return (left - right) * direction;
      });
    }
    return [...items].sort(
      (a, b) =>
        (PRIORITY_RANK[a.priority] ?? 99) - (PRIORITY_RANK[b.priority] ?? 99) ||
        a.slaDeadline.getTime() - b.slaDeadline.getTime(),
    );
  }

  private clone(study: Study): Study {
    const copy = new Study({
      studyId: study.studyId,
      accessionNumber: study.accessionNumber,
      patientName: study.patientName,
      modality: study.modality,
      priority: study.priority,
      status: study.status,
      orderedAt: study.orderedAt,
      slaDeadline: study.slaDeadline,
      assignedTo: study.assignedTo,
      reportId: study.reportId,
      version: study.version,
    });
    return copy;
  }
}
