import type { Modality, Priority, StudyStatus } from '@radflow/shared';
import type { ISearchableRepository } from '../../shared/domain/repository/repository.interface';
import { SearchParams } from '../../shared/domain/repository/search-params';
import { SearchResult } from '../../shared/domain/repository/search-result';
import type { Study } from './study.aggregate';
import type { StudyId } from './value-objects/ids.vo';

export type StudyFilter = {
  status?: StudyStatus;
  modality?: Modality;
  priority?: Priority;
  assignedTo?: string;
};

export class StudySearchParams extends SearchParams<StudyFilter> {}
export class StudySearchResult extends SearchResult<Study> {}

export interface IStudyRepository
  extends ISearchableRepository<Study, StudyId, StudyFilter, StudySearchParams, StudySearchResult> {
  findByAccessionNumber(accessionNumber: string): Promise<Study | null>;
}

export class DuplicatedAccessionNumberError extends Error {
  constructor(accessionNumber: string) {
    super(`A study with accession number ${accessionNumber} already exists`);
    this.name = 'DuplicatedAccessionNumberError';
  }
}
