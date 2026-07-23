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
  PORT: number = 3002;

  /** 0 binds an ephemeral port (used by tests). */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(65535)
  MLLP_PORT: number = 2575;

  @IsString()
  NATS_URL: string = 'nats://localhost:4222';

  @IsString()
  ORTHANC_URL: string = 'http://localhost:8042';
}
