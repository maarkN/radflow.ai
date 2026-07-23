import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class StartReportRequestDto {
  @IsUUID()
  studyId!: string;

  @IsUUID()
  radiologistId!: string;
}

export class AttachTranscriptRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50_000)
  transcript!: string;
}

export class SectionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  technique?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50_000)
  findings?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10_000)
  impression?: string;
}

export class UpdateReportRequestDto {
  @ValidateNested()
  @Type(() => SectionsDto)
  sections!: SectionsDto;
}

export class SignReportRequestDto {
  @IsUUID()
  radiologistId!: string;
}
