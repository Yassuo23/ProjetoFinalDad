import { describe, expect, it } from 'vitest'
import { politicaCsp } from './Csp'

describe('politicaCsp', () => {
  it('usa CSP rígida em produção', () => {
    const csp = politicaCsp('producao')

    expect(csp).not.toContain('unsafe-inline')
    expect(csp).not.toContain('unsafe-eval')
    expect(csp).not.toContain('ws:')
    expect(csp).toContain("script-src 'self'")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("frame-ancestors 'none'")
  })

  it('mantém apenas o necessário para HMR em desenvolvimento', () => {
    const csp = politicaCsp('desenvolvimento')

    expect(csp).toContain('ws:')
    expect(csp).toContain("script-src 'self' 'unsafe-inline'")
  })
})
