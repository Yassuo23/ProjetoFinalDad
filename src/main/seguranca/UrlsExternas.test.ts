import { describe, expect, it } from 'vitest'
import { urlExternaPermitida } from './UrlsExternas'

describe('urlExternaPermitida', () => {
  it('aceita apenas https nos domínios da allowlist', () => {
    expect(urlExternaPermitida('https://electronjs.org/docs')).toBe(true)
    expect(urlExternaPermitida('https://api.open-meteo.com/v1/forecast')).toBe(true)
    expect(urlExternaPermitida('https://viacep.com.br/ws/01001000/json/')).toBe(true)
    expect(urlExternaPermitida('https://brasilapi.com.br/api/cnpj/v1/00000000000191')).toBe(true)
    expect(urlExternaPermitida('https://subdomain.electronjs.org/docs')).toBe(true)
  })

  it('rejeita esquemas locais e domínios fora da lista', () => {
    expect(urlExternaPermitida('file:///C:/Windows/System32/calc.exe')).toBe(false)
    expect(urlExternaPermitida('http://electronjs.org/docs')).toBe(false)
    expect(urlExternaPermitida('https://evil.com/?next=electronjs.org')).toBe(false)
    expect(urlExternaPermitida('https://electronjs.org.evil.com')).toBe(false)
    expect(urlExternaPermitida('nao-e-uma-url')).toBe(false)
  })
})
