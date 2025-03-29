module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/test'], // Look for tests in the test directory
  moduleNameMapper: {
    // Handle module paths, adjust if your structure differs
    '^@src/(.*)$': '<rootDir>/src/$1'
  },
  // Optional: Setup files before tests run
  // setupFilesAfterEnv: ['<rootDir>/test/setupTests.ts'],
  testPathIgnorePatterns: [ // Ignore dist folder
    "<rootDir>/dist/"
  ]
}; 