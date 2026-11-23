import { describe, expect, it } from 'vitest'
import { CSP_DEV, CSP_PRODUCAO } from '../../shared/seguranca/politicasCsp'
import { politicaCsp } from './Csp'

describe('políticas CSP', () => {
  it('produção não permite inline, eval nem websocket', () => {
    expect(CSP_PRODUCAO).not.toContain("'unsafe-inline'")
    expect(CSP_PRODUCAO).not.toContain("'unsafe-eval'")
    expect(CSP_PRODUCAO).not.toContain('ws:')
    expect(CSP_PRODUCAO).toContain("default-src 'self'")
  })

  it('dev permite apenas o necessário para o Vite', () => {
    expect(CSP_DEV).toContain("'unsafe-inline'")
    expect(CSP_DEV).toContain('ws://localhost:5173')
    expect(politicaCsp(true)).toBe(CSP_DEV)
    expect(politicaCsp(false)).toBe(CSP_PRODUCAO)
  })
})
