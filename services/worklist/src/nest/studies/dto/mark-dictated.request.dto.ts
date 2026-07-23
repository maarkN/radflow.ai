import { IsUUID } from 'class-validator';

export class MarkDictatedRequestDto {
  @IsUUID()
  reportId!: string;

  @IsUUID()
  radiologistId!: string;
}
