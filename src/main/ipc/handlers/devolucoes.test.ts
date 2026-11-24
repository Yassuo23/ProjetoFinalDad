import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  CalculoMulta,
  Devolucao,
  DevolucaoRegistrarEntrada,
  MultaCalcularEntrada,
} from '../../../shared/contratos/modelos'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import type { ServicoDevolucoes } from '../../servicos/DevolucaoServico'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarDevolucoes } from './devolucoes'

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

const ENTRADA_REGISTRAR: DevolucaoRegistrarEntrada = {
  reservaId: 7,
  devolvidoEm: '2026-12-15T12:00:00.000Z',
  observacoes: 'Atraso na entrega',
}

const ENTRADA_CALCULAR: MultaCalcularEntrada = {
  reservaId: 7,
  devolvidoEm: ENTRADA_REGISTRAR.devolvidoEm,
}

const DEVOLUCAO: Devolucao = {
  id: 55,
  reservaId: 7,
  devolvidoEm: ENTRADA_REGISTRAR.devolvidoEm,
  observacoes: ENTRADA_REGISTRAR.observacoes ?? null,
  diasAtraso: 10,
  valorDiaria: 80,
  valorMulta: 50,
}

const CALCULO: CalculoMulta = {
  diasAtraso: 10,
  diasCarencia: 90,
  valorDiaria: 80,
  valorLocacao: 320,
  baseCalculo: 1000,
  percentualDiario: 0.005,
  valorMultaBruta: 50,
  valorMulta: 50,
  valorTotal: 370,
  tetoAplicado: false,
}

function servicoFalso() {
  const registrar = vi.fn((_dados: DevolucaoRegistrarEntrada): Devolucao => DEVOLUCAO)
  const buscarPorReserva = vi.fn((_reservaId: number): Devolucao => DEVOLUCAO)
  const calcular = vi.fn((_entrada: MultaCalcularEntrada): CalculoMulta => CALCULO)
  const servico: ServicoDevolucoes = { registrar, buscarPorReserva, calcular }
  return { servico, registrar, buscarPorReserva, calcular }
}

function registrarTudo(ipc: RegistradorFalso, servico: ServicoDevolucoes): void {
  registrarDevolucoes(new RegistroIpc(ipc), servico)
}

describe('handlers de devoluções', () => {
  it('registra os três canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarTudo(ipc, servico.servico)

    expect(await ipc.invocar(CANAIS.devolucoesRegistrar, ENTRADA_REGISTRAR)).toEqual(DEVOLUCAO)
    expect(await ipc.invocar(CANAIS.devolucoesBuscarPorReserva, { reservaId: 7 })).toEqual(
      DEVOLUCAO,
    )
    expect(await ipc.invocar(CANAIS.multasCalcular, ENTRADA_CALCULAR)).toEqual(CALCULO)

    expect(servico.registrar).toHaveBeenCalledWith(ENTRADA_REGISTRAR)
    expect(servico.buscarPorReserva).toHaveBeenCalledWith(7)
    expect(servico.calcular).toHaveBeenCalledWith(ENTRADA_CALCULAR)
  })

  it('rejeita payload inválido com IPC_INVALIDO do canal', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarTudo(ipc, servico.servico)

    const casos: readonly [Canal, unknown][] = [
      [CANAIS.devolucoesRegistrar, { ...ENTRADA_REGISTRAR, reservaId: 0 }],
      [CANAIS.devolucoesRegistrar, { ...ENTRADA_REGISTRAR, devolvidoEm: ' ontem ' }],
      [CANAIS.devolucoesBuscarPorReserva, {}],
      [CANAIS.multasCalcular, { reservaId: -1, devolvidoEm: ENTRADA_CALCULAR.devolvidoEm }],
    ]

    for (const [canal, payload] of casos) {
      await expect(ipc.invocar(canal, payload)).rejects.toThrow(`IPC_INVALIDO:${canal}`)
    }
    expect(servico.registrar).not.toHaveBeenCalled()
    expect(servico.buscarPorReserva).not.toHaveBeenCalled()
    expect(servico.calcular).not.toHaveBeenCalled()
  })

  it('propaga DEVOLUCAO_JA_REGISTRADA sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    servico.registrar.mockImplementation(() => {
      throw new ErroDeDominio('DEVOLUCAO_JA_REGISTRADA', 'Devolução já registrada.')
    })
    registrarTudo(ipc, servico.servico)

    await expect(ipc.invocar(CANAIS.devolucoesRegistrar, ENTRADA_REGISTRAR)).rejects.toThrow(
      'DEVOLUCAO_JA_REGISTRADA',
    )
  })

  it('propaga RESERVA_NAO_CONFIRMADA sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    servico.registrar.mockImplementation(() => {
      throw new ErroDeDominio('RESERVA_NAO_CONFIRMADA', 'Reserva não está confirmada.')
    })
    registrarTudo(ipc, servico.servico)

    await expect(ipc.invocar(CANAIS.devolucoesRegistrar, ENTRADA_REGISTRAR)).rejects.toThrow(
      'RESERVA_NAO_CONFIRMADA',
    )
  })

  it('propaga MULTA_BASE_INDISPONIVEL sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    servico.calcular.mockImplementation(() => {
      throw new ErroDeDominio('MULTA_BASE_INDISPONIVEL', 'Base indisponível.')
    })
    registrarTudo(ipc, servico.servico)

    await expect(ipc.invocar(CANAIS.multasCalcular, ENTRADA_CALCULAR)).rejects.toThrow(
      'MULTA_BASE_INDISPONIVEL',
    )
  })
})
