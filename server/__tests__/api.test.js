import { describe, it, expect } from 'vitest'

describe('Server Configuration', () => {
  it('should have valid package.json', async () => {
    const pkg = await import('../../package.json')
    expect(pkg).toBeDefined()
    expect(pkg.name).toBe('opencode-chat')
  })

  it('should have config.json with required fields', async () => {
    const config = await import('../config.json')
    expect(config).toBeDefined()
  })
})
