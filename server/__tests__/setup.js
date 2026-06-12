import { beforeAll, afterAll } from 'vitest'

beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test'
  process.env.PORT = '3001'
})

afterAll(() => {
  // Cleanup
})
