import { describe, expect, it } from 'vitest'
import { ErroSemPermissao } from '../nucleo/erros'
import { urlExternaPermitida, validarUrlExterna } from './UrlsExternas'

describe('UrlsExternas', () => {
  it('rejeita file:///C:/Windows/System32/calc.exe', () => {
    const ataque = 'file:///C:/Windows/System32/calc.exe'
    expect(urlExternaPermitida(ataque)).toBe(false)
    expect(() => validarUrlExterna(ataque)).toThrow(ErroSemPermissao)
  })

  it('rejeita http, esquemas exóticos e domínios fora da allowlist', () => {
    expect(urlExternaPermitida('http://electronjs.org/docs')).toBe(false)
    expect(urlExternaPermitida('mailto:suporte@zenite.com.br')).toBe(false)
    expect(urlExternaPermitida('https://google.com')).toBe(false)
    expect(() => validarUrlExterna('http://electronjs.org')).toThrow(ErroSemPermissao)
  })

  it('aceita https dos domínios usados pelo app e seus subdomínios', () => {
    expect(urlExternaPermitida('https://www.electronjs.org/docs')).toBe(true)
    expect(urlExternaPermitida('https://viacep.com.br/ws/01001000/json/')).toBe(true)
    expect(urlExternaPermitida('https://api.open-meteo.com/v1/forecast')).toBe(true)
    expect(urlExternaPermitida('https://brasilapi.com.br/api/cep/v1/01001000')).toBe(true)
  })

  it('rejeita URL malformada sem lançar erro cru', () => {
    expect(() => validarUrlExterna('%%%')).toThrow(ErroSemPermissao)
  })
})
