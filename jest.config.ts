import type { Config } from 'jest'
import nextJest from 'next/jest.js'

const createJestConfig = nextJest({ dir: './' })

const config: Config = {
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/.next/'],
  modulePathIgnorePatterns: ['<rootDir>/.next/'],
}

const jestConfig = async () => {
  const fn = createJestConfig(config)
  const resolved = await fn()
  return {
    ...resolved,
    transformIgnorePatterns: [
      'node_modules/(?!(bson|zod)/)',
    ],
  }
}

export default jestConfig
