export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react',
          esModuleInterop: true,
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx', '**/?(*.)+(spec|test).ts', '**/?(*.)+(spec|test).tsx'],
  collectCoverageFrom: ['src/**/*.ts', 'src/**/*.tsx', '!src/**/*.d.ts', '!src/main.tsx'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
};
