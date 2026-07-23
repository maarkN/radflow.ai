import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class SignStudyRequestDto {
  @IsUUID()
  radiologistId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  contentHash!: string;
}
