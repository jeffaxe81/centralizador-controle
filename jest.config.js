module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', '/apps/'], // apps/api e apps/web precisam de setup proprio (Prisma/Next) -- fora do escopo deste config
  moduleNameMapper: {
    '^@centralizador-controle/shared$': '<rootDir>/packages/shared/src/index.ts',
  },
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
};
