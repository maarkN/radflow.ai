import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import type { Modality, Priority, StudyStatus } from '@radflow/shared';
import type { SortDirection } from '@radflow/ddd';

export class SearchStudiesRequestDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  perPage?: number;

  @IsOptional()
  @IsIn(['priority', 'slaDeadline', 'orderedAt'])
  sort?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortDir?: SortDirection;

  @IsOptional()
  @IsIn(['unread', 'in_progress', 'dictated', 'signed'])
  status?: StudyStatus;

  @IsOptional()
  @IsIn(['CT', 'MR', 'CR', 'US'])
  modality?: Modality;

  @IsOptional()
  @IsIn(['stat', 'urgent', 'routine'])
  priority?: Priority;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;
}
