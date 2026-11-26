import { describe, expect, it } from 'vitest'
import type { Sessao } from '../../shared/contratos/modelos'
import { idClienteDaSessao } from './EscopoCliente'

function provedor(ativa: Sessao | null): { sessao(): Sessao | null } {
  return { sessao: () => ativa }
}

function sessao(perfil: Sessao['perfil'], clienteId?: number | null): Sessao {
  return {
    usuarioId: 1,
    nome: 'Teste',
    login: 'teste',
    perfil,
    clienteId,
  }
}

describe('EscopoCliente — propriedade derivada da sessão (ADR 0009)', () => {
  it('não filtra staff nem chamadores anônimos', () => {
    expect(idClienteDaSessao(provedor(null))).toBeUndefined()
    expect(idClienteDaSessao(provedor(sessao('Administrador')))).toBeUndefined()
    expect(idClienteDaSessao(provedor(sessao('Atendente')))).toBeUndefined()
  })

  it('devolve somente o id do cliente da sessão', () => {
    expect(idClienteDaSessao(provedor(sessao('Cliente', 42)))).toBe(42)
  })

  it('falha fechado quando a conta Cliente não tem vínculo', () => {
    for (const invalido of [undefined, null, 0, -1, 1.5]) {
      expect(() => idClienteDaSessao(provedor(sessao('Cliente', invalido)))).toThrow(
        expect.objectContaining({ codigo: 'NAO_ENCONTRADO' }),
      )
    }
  })
})
