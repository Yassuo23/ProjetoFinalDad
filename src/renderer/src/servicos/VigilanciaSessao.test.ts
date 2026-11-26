import { describe, expect, it } from 'vitest'
import { sessaoExpirada } from './VigilanciaSessao'

function erroComCodigo(codigo: string): Error {
  return new Error(codigo)
}

describe('VigilanciaSessao', () => {
  it('reconhece apenas o código estável de sessão encerrada', () => {
    expect(sessaoExpirada(erroComCodigo('NAO_AUTENTICADO'))).toBe(true)
    expect(sessaoExpirada(erroComCodigo('SEM_PERMISSAO'))).toBe(false)
    expect(sessaoExpirada(erroComCodigo('CREDENCIAIS_INVALIDAS'))).toBe(false)
  })

  it('não trata valores que não são Error como expiração', () => {
    expect(sessaoExpirada('NAO_AUTENTICADO')).toBe(false)
    expect(sessaoExpirada(null)).toBe(false)
    expect(sessaoExpirada({ message: 'NAO_AUTENTICADO' })).toBe(false)
  })
})
