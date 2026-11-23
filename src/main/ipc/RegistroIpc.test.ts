import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { CANAIS, type Canal } from '../../shared/contratos/canais'
import { RegistroIpc, type RegistradorIpc } from './RegistroIpc'

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

describe('RegistroIpc', () => {
  it('valida o payload e entrega o valor tipado ao serviço', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc)
    const tratar = vi.fn(async (entrada: { url: string }): Promise<number> => entrada.url.length)

    registro.registrar(CANAIS.abrirExterno, z.object({ url: z.url() }), tratar)

    await expect(ipc.invocar(CANAIS.abrirExterno, { url: 'https://example.com' })).resolves.toBe(19)
    expect(tratar).toHaveBeenCalledWith({ url: 'https://example.com' })
  })

  it('rejeita payload inválido sem vazar o detalhe do Zod', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc)
    const tratar = vi.fn(async (): Promise<void> => undefined)

    registro.registrar(CANAIS.abrirExterno, z.object({ url: z.url() }), tratar)

    await expect(ipc.invocar(CANAIS.abrirExterno, { url: 'nao-e-url' })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.abrirExterno}`,
    )
    expect(tratar).not.toHaveBeenCalled()
  })

  it('impede dois handlers para o mesmo canal', () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc)

    registro.registrar(CANAIS.appInfo, z.undefined(), async () => 'ok')

    expect(() => registro.registrar(CANAIS.appInfo, z.undefined(), async () => 'ok')).toThrow(
      `Canal duplicado: ${CANAIS.appInfo}`,
    )
    expect(registro.total).toBe(1)
  })
})
