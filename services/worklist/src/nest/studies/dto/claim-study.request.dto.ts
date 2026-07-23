import { IsUUID } from 'class-validator';

export class ClaimStudyRequestDto {
  @IsUUID()
  radiologistId!: string;
}
