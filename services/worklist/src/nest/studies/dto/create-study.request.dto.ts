import { IsDateString, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { Modality, Priority } from '@radflow/shared';

export class CreateStudyRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  accessionNumber!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  patientName!: string;

  @IsIn(['CT', 'MR', 'CR', 'US'])
  modality!: Modality;

  @IsIn(['stat', 'urgent', 'routine'])
  priority!: Priority;

  @IsOptional()
  @IsDateString()
  orderedAt?: string;
}
