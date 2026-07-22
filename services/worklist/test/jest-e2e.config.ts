import type { Config } from 'jest';

process.env.TZ = 'UTC';
process.env.NODE_ENV = 'test';

const config: Config = {
  rootDir: '..',
  roots: ['<rootDir>/test'],
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2022',
        },
      },
    ],
  },
  setupFiles: ['reflect-metadata'],
  clearMocks: true,
  testEnvironment: 'node',
};

export default config;
