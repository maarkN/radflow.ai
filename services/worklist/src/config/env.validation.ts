import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvDto } from './env.dto';

export function validateEnv(config: Record<string, unknown>): EnvDto {
  const env = plainToInstance(EnvDto, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(env);
  if (errors.length > 0) {
    const details = errors
      .map((error) => `${error.property}: ${Object.values(error.constraints ?? {}).join('; ')}`)
      .join(' | ');
    throw new Error(`Invalid environment: ${details}`);
  }
  return env;
}
