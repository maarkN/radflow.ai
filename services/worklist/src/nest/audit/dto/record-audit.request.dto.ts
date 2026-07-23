import { IsNotEmpty, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordAuditRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  actor!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  action!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  entityType!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  entityId!: string;

  @IsOptional()
  @IsObject()
  detail?: Record<string, unknown>;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  origin!: string;
}
