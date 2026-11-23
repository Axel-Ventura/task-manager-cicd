export default {
  testEnvironment: 'node',
  clearMocks: true,
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageProvider: 'v8',
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  },
};
