import { NodeEnv } from '../env.dto';
import { validateEnv } from '../env.validation';

describe('validateEnv', () => {
  it('applies defaults when nothing is provided', () => {
    const env = validateEnv({});
    expect(env.NODE_ENV).toBe(NodeEnv.Development);
    expect(env.PORT).toBe(3000);
  });

  it('parses PORT from string (as it comes in process.env)', () => {
    expect(validateEnv({ PORT: '4000' }).PORT).toBe(4000);
  });

  it.each([
    ['PORT is not a number', { PORT: 'abc' }],
    ['PORT is out of range', { PORT: '70000' }],
    ['NODE_ENV is unknown', { NODE_ENV: 'staging' }],
  ])('throws when %s', (_label, config) => {
    expect(() => validateEnv(config)).toThrow(/Invalid environment/);
  });
});
