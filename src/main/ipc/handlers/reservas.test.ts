import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  PrevisaoTempo,
  PrevisaoTempoEntrada,
  Reserva,
  ReservaCriarEntrada,
  ReservasListarFiltros,
} from '../../../shared/contratos/modelos'
import type { ServicoClima } from '../../servicos/ClimaServico'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import type { ServicoReservas } from '../../servicos/ReservaServico'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarReservas } from './reservas'

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

const reserva: Reserva = {
  id: 10,
  clienteId: 1,
  equipamentoId: 1,
  inicio: '2026-12-01T00:00:00.000Z',
  fim: '2026-12-05T00:00:00.000Z',
  status: 'pendente',
  localAtividade: 'Serra da Mantiqueira',
  criadoEm: '2026-11-23 10:00:00',
}

const CRIAR: ReservaCriarEntrada = {
  clienteId: 1,
  equipamentoId: 1,
  inicio: reserva.inicio,
  fim: reserva.fim,
  localAtividade: reserva.localAtividade ?? '',
}

const PREVISAO: PrevisaoTempoEntrada = {
  local: 'Campos do Jordao',
  inicio: reserva.inicio,
  fim: reserva.fim,
}

const previsao: PrevisaoTempo = {
  local: 'Campos do Jordão',
  latitude: -22.7,
  longitude: -45.5,
  dias: [],
}

function servicoFalso() {
  const listar = vi.fn((_filtros?: ReservasListarFiltros): Reserva[] => [reserva])
  const buscarPorId = vi.fn((_id: number): Reserva => reserva)
  const criar = vi.fn((_dados: ReservaCriarEntrada): Reserva => reserva)
  const confirmar = vi.fn((_id: number): Reserva => ({ ...reserva, status: 'confirmada' }))
  const cancelar = vi.fn((_id: number): void => undefined)
  const servico: ServicoReservas = { listar, buscarPorId, criar, confirmar, cancelar }
  return { servico, listar, buscarPorId, criar, confirmar, cancelar }
}

function climaFalso() {
  const previsaoTempo = vi.fn((_entrada: PrevisaoTempoEntrada): Promise<PrevisaoTempo> =>
    Promise.resolve(previsao),
  )
  const clima: ServicoClima = { previsao: previsaoTempo }
  return { clima, previsaoTempo }
}

describe('handlers de reservas', () => {
  it('registra os seis canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const reservas = servicoFalso()
    const clima = climaFalso()
    registrarReservas(new RegistroIpc(ipc), reservas.servico, clima.clima)

    const filtros = { status: 'pendente' as const, clienteId: 1 }
    expect(await ipc.invocar(CANAIS.reservasListar, filtros)).toEqual([reserva])
    expect(await ipc.invocar(CANAIS.reservasBuscarPorId, { id: 10 })).toEqual(reserva)
    expect(await ipc.invocar(CANAIS.reservasCriar, CRIAR)).toEqual(reserva)
    expect(await ipc.invocar(CANAIS.reservasConfirmar, { id: 10 })).toEqual({
      ...reserva,
      status: 'confirmada',
    })
    await expect(ipc.invocar(CANAIS.reservasCancelar, { id: 10 })).resolves.toBeUndefined()
    expect(await ipc.invocar(CANAIS.reservasPrevisaoTempo, PREVISAO)).toEqual(previsao)

    expect(reservas.listar).toHaveBeenCalledWith(filtros)
    expect(reservas.buscarPorId).toHaveBeenCalledWith(10)
    expect(reservas.criar).toHaveBeenCalledWith(CRIAR)
    expect(reservas.confirmar).toHaveBeenCalledWith(10)
    expect(reservas.cancelar).toHaveBeenCalledWith(10)
    expect(clima.previsaoTempo).toHaveBeenCalledWith(PREVISAO)
  })

  it('rejeita payload inválido com IPC_INVALIDO do canal', async () => {
    const ipc = new RegistradorFalso()
    const reservas = servicoFalso()
    const clima = climaFalso()
    registrarReservas(new RegistroIpc(ipc), reservas.servico, clima.clima)

    const casos: readonly [Canal, unknown][] = [
      [CANAIS.reservasListar, { clienteId: -1 }],
      [CANAIS.reservasBuscarPorId, { id: 0 }],
      [CANAIS.reservasCriar, { ...CRIAR, fim: CRIAR.inicio }],
      [CANAIS.reservasConfirmar, { id: 'dez' }],
      [CANAIS.reservasCancelar, {}],
      [CANAIS.reservasPrevisaoTempo, { ...PREVISAO, local: '' }],
    ]

    for (const [canal, payload] of casos) {
      await expect(ipc.invocar(canal, payload)).rejects.toThrow(`IPC_INVALIDO:${canal}`)
    }
    expect(reservas.criar).not.toHaveBeenCalled()
    expect(reservas.confirmar).not.toHaveBeenCalled()
    expect(reservas.cancelar).not.toHaveBeenCalled()
    expect(clima.previsaoTempo).not.toHaveBeenCalled()
  })

  it('propaga ITEM_INDISPONIVEL sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const reservas = servicoFalso()
    reservas.criar.mockImplementation(() => {
      throw new ErroDeDominio('ITEM_INDISPONIVEL', 'Equipamento indisponível.')
    })
    registrarReservas(new RegistroIpc(ipc), reservas.servico, climaFalso().clima)

    await expect(ipc.invocar(CANAIS.reservasCriar, CRIAR)).rejects.toThrow('ITEM_INDISPONIVEL')
  })

  it('propaga LOCAL_NAO_ENCONTRADO do serviço de clima', async () => {
    const ipc = new RegistradorFalso()
    const clima = climaFalso()
    clima.previsaoTempo.mockImplementation(() =>
      Promise.reject(new ErroDeDominio('LOCAL_NAO_ENCONTRADO', 'Local não encontrado.')),
    )
    registrarReservas(new RegistroIpc(ipc), servicoFalso().servico, clima.clima)

    await expect(ipc.invocar(CANAIS.reservasPrevisaoTempo, PREVISAO)).rejects.toThrow(
      'LOCAL_NAO_ENCONTRADO',
    )
  })
})
