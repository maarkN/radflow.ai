import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';

export enum NodeEnv {
  Development = 'development',
  Test = 'test',
  Production = 'production',
}

export class EnvDto {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3003;

  @IsString()
  DATABASE_URL: string = 'postgresql://radflow:radflow@localhost:5434/radflow';

  @IsString()
  NATS_URL: string = 'nats://localhost:4222';

  @IsString()
  REPORT_AI_URL: string = 'http://localhost:8000';

  @IsString()
  WORKLIST_URL: string = 'http://localhost:3001';

  @Type(() => Number)
  @IsInt()
  @Min(50)
  OUTBOX_POLL_INTERVAL_MS: number = 500;
}
