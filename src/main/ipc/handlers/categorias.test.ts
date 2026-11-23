import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type { Categoria } from '../../../shared/contratos/modelos'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarCategorias } from './categorias'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: Canal, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal não registrado: ${canal}`)
    return ouvinte(undefined, payload)
  }
}

const categorias: Categoria[] = [{ id: 1, nome: 'Camping', descricao: null }]

describe('handler de categorias', () => {
  it('valida a entrada e delega a listagem ao serviço', async () => {
    const ipc = new RegistradorFalso()
    const listar = vi.fn(() => categorias)

    registrarCategorias(new RegistroIpc(ipc), { listar })

    await expect(ipc.invocar(CANAIS.categoriasListar)).resolves.toEqual(categorias)
    expect(listar).toHaveBeenCalledOnce()
  })

  it('rejeita payload inesperado sem chamar o serviço', async () => {
    const ipc = new RegistradorFalso()
    const listar = vi.fn(() => categorias)

    registrarCategorias(new RegistroIpc(ipc), { listar })

    await expect(ipc.invocar(CANAIS.categoriasListar, { inesperado: true })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.categoriasListar}`,
    )
    expect(listar).not.toHaveBeenCalled()
  })
})
