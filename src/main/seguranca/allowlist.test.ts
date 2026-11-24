import { describe, expect, it } from 'vitest'
import { ErroUrlNaoPermitida, urlExternaPermitida, validarUrlExterna } from './allowlist'

describe('allowlist de URLs externas', () => {
  it('aceita checkout da Stripe e a documentação do Electron', () => {
    expect(urlExternaPermitida('https://checkout.stripe.com/c/pay/cs_test_123')).toBe(true)
    expect(urlExternaPermitida('https://www.electronjs.org/docs')).toBe(true)
  })

  it('rejeita HTTP, domínios não listados e lookalikes', () => {
    expect(urlExternaPermitida('http://checkout.stripe.com/pay')).toBe(false)
    expect(urlExternaPermitida('https://evil.example')).toBe(false)
    expect(urlExternaPermitida('https://checkout.stripe.com.evil.example')).toBe(false)
    expect(urlExternaPermitida('https://foo.checkout.stripe.com')).toBe(false)
    expect(urlExternaPermitida('https://checkout.stripe.com:8443/pay')).toBe(false)
    expect(urlExternaPermitida('https://user@checkout.stripe.com/pay')).toBe(false)
    expect(urlExternaPermitida('url-invalida')).toBe(false)
  })

  it('bloqueia openExternal com erro tipado', () => {
    expect(() => validarUrlExterna('https://evil.example')).toThrow(ErroUrlNaoPermitida)
  })
})
