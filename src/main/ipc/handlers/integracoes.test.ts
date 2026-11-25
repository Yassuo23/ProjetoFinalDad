import { describe, expect, it, vi } from 'vitest'
import { CANAIS } from '../../../shared/contratos/canais'
import type { RegistradorIpc, RegistroIpc as TipoRegistro } from '../RegistroIpc'
import { RegistroIpc } from '../RegistroIpc'
import { registrarIntegracoes } from './integracoes'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: string, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal não registrado: ${canal}`)
    return ouvinte(undefined, payload)
  }
}

function composicao(): { ipc: RegistradorFalso; registro: TipoRegistro } {
  const ipc = new RegistradorFalso()
  const registro = new RegistroIpc(ipc)
  registrarIntegracoes(registro, {
    previsaoTempo: {
      consultar: async (data) => ({ estado: 'indisponivel', data, motivo: 'SEM_DADOS' }),
    },
    cnpj: {
      consultar: async (cnpj) => ({ estado: 'indisponivel', cnpj, motivo: 'SERVICO_FORA' }),
    },
    feriados: {
      feriados: async (ano) => ({
        estado: 'indisponivel',
        ano,
        motivo: 'SERVICO_FORA',
        feriados: [],
      }),
    },
  })
  return { ipc, registro }
}

describe('handlers de integrações', () => {
  it('registra os três canais e devolve os retornos discriminados', async () => {
    const { ipc, registro } = composicao()
    expect(registro.total).toBe(3)

    expect(await ipc.invocar(CANAIS.integracoesPrevisaoTempo, { data: '2026-11-26' })).toEqual({
      estado: 'indisponivel',
      data: '2026-11-26',
      motivo: 'SEM_DADOS',
    })
    expect(await ipc.invocar(CANAIS.integracoesCnpj, { cnpj: '11444777000161' })).toEqual({
      estado: 'indisponivel',
      cnpj: '11444777000161',
      motivo: 'SERVICO_FORA',
    })
    expect(await ipc.invocar(CANAIS.integracoesFeriados, { ano: 2026 })).toEqual({
      estado: 'indisponivel',
      ano: 2026,
      motivo: 'SERVICO_FORA',
      feriados: [],
    })
  })

  it('rejeita payload inválido no schema do main', async () => {
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      const { ipc } = composicao()
      await expect(ipc.invocar(CANAIS.integracoesPrevisaoTempo, { data: '26/11/2026' })).rejects.toThrow(
        `IPC_INVALIDO:${CANAIS.integracoesPrevisaoTempo}`,
      )
      await expect(ipc.invocar(CANAIS.integracoesFeriados, { ano: 2019 })).rejects.toThrow(
        `IPC_INVALIDO:${CANAIS.integracoesFeriados}`,
      )
    } finally {
      espiao.mockRestore()
    }
  })
})
