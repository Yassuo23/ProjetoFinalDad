import { describe, expect, it } from 'vitest'
import { comCabecalhoCsp, politicaCsp } from './Csp'

describe('Csp', () => {
  it('producao nao tem unsafe-inline, unsafe-eval nem ws', () => {
    const politica = politicaCsp(false)

    expect(politica).not.toContain('unsafe-inline')
    expect(politica).not.toContain('unsafe-eval')
    expect(politica).not.toContain('ws:')
    expect(politica).toContain("script-src 'self'")
    expect(politica).toContain("connect-src 'self'")
  })

  it('dev permite apenas o cliente e o HMR do Vite', () => {
    const politica = politicaCsp(true)

    expect(politica).toContain('ws://localhost:5173')
    expect(politica).toContain("'unsafe-inline'")
    expect(politica).not.toContain('unsafe-eval')
  })

  it('substitui CSP antiga e preserva outros cabecalhos', () => {
    const cabecalhos = {
      'content-security-policy': ["script-src 'unsafe-inline'"],
      'X-Frame-Options': ['DENY'],
    }

    const resultado = comCabecalhoCsp(cabecalhos, false)

    expect(resultado['X-Frame-Options']).toEqual(['DENY'])
    expect(resultado['content-security-policy']).toBeUndefined()
    expect(resultado['Content-Security-Policy']).toEqual([politicaCsp(false)])
  })
})
