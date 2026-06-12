/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/../../TESTS/**/*.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/../../TESTS/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: ['src/services/settlement.ts', 'src/routes/rides.ts'],
};
