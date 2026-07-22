import type { Config } from 'jest';

process.env.TZ = 'UTC';

const config: Config = {
  rootDir: 'src',
  testRegex: '.*\\..*spec\\.ts$',
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
  collectCoverageFrom: ['**/*.ts', '!**/__tests__/**', '!main.ts'],
};

export default config;
