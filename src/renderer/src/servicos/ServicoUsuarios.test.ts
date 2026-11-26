import { afterEach, describe, expect, it, vi } from 'vitest'
import type { UsuarioPublico } from '../../../shared/contratos/modelos'
import { ServicoUsuarios } from './ServicoUsuarios'

const USUARIO: UsuarioPublico = {
  id: 7,
  nome: 'Ana Souza',
  login: 'ana.souza',
  perfil: 'Atendente',
  ativo: true,
  atualizadoEm: '2026-11-25T10:00:00.000Z',
}

function instalarFachada(usuario: {
  buscarPorId: (id: number) => Promise<UsuarioPublico>
  inativar: (id: number) => Promise<void>
}): void {
  vi.stubGlobal('window', { electronAPI: { usuarios: usuario } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ServicoUsuarios — fachada do renderer', () => {
  it('buscarPorId usa a API tipada e devolve o registro sem senha', async () => {
    const buscarPorId = vi.fn(async () => USUARIO)
    const inativar = vi.fn(async () => undefined)
    instalarFachada({ buscarPorId, inativar })

    expect(await new ServicoUsuarios().buscarPorId(7)).toEqual(USUARIO)
    expect(buscarPorId).toHaveBeenCalledWith(7)
    expect(inativar).not.toHaveBeenCalled()
  })

  it('inativar usa a API tipada pelo id e não propaga dado inventado', async () => {
    const buscarPorId = vi.fn(async () => USUARIO)
    const inativar = vi.fn(async () => undefined)
    instalarFachada({ buscarPorId, inativar })

    await expect(new ServicoUsuarios().inativar(7)).resolves.toBeUndefined()
    expect(inativar).toHaveBeenCalledWith(7)
    expect(buscarPorId).not.toHaveBeenCalled()
  })

  it('propaga a falha do canal em vez de engoli-la', async () => {
    const buscarPorId = vi.fn(async () => USUARIO)
    const inativar = vi.fn(async () => {
      throw new Error('FALHA_CANAL')
    })
    instalarFachada({ buscarPorId, inativar })

    await expect(new ServicoUsuarios().inativar(7)).rejects.toThrow('FALHA_CANAL')
    expect(inativar).toHaveBeenCalledTimes(1)
  })
})
