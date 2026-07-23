import type { Config } from 'jest';

process.env.TZ = 'UTC';

const config: Config = {
  rootDir: 'src',
  testRegex: '.*\\..*spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['@swc/jest', {}],
  },
  clearMocks: true,
  testEnvironment: 'node',
};

export default config;
