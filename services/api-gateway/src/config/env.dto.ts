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
  PORT: number = 3000;

  @IsString()
  WORKLIST_URL: string = 'http://localhost:3001';

  @IsString()
  INTEGRATION_URL: string = 'http://localhost:3002';

  @IsString()
  DICTATION_URL: string = 'http://localhost:3003';

  @IsString()
  NATS_URL: string = 'nats://localhost:4222';
}
