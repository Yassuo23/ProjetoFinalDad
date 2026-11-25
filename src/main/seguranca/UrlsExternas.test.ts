import { describe, expect, it } from 'vitest'
import { urlExternaPermitida } from './UrlsExternas'

describe('urlExternaPermitida', () => {
  it('aceita apenas https e hosts da allowlist', () => {
    expect(urlExternaPermitida('https://www.electronjs.org/docs')).toBe(true)
    expect(urlExternaPermitida('https://github.com/zenite')).toBe(true)
  })

  it('rejeita esquema file, http e subdomínios fraudulentos', () => {
    expect(urlExternaPermitida('file:///C:/Windows/System32/calc.exe')).toBe(false)
    expect(urlExternaPermitida('http://electronjs.org')).toBe(false)
    expect(urlExternaPermitida('https://electronjs.org.evil.test')).toBe(false)
    expect(urlExternaPermitida('nao-e-uma-url')).toBe(false)
  })
})
