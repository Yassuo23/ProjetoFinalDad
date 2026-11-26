import { afterEach, describe, expect, it, vi } from 'vitest'
import { CANAIS } from '../../../shared/contratos/canais'
import type {
  ServicoDashboard,
  ServicoDevolucoes,
  ServicoManutencao,
} from '../../servicos/portas'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarDashboard } from './dashboard'
import { registrarDevolucoes } from './devolucoes'
import { registrarManutencao } from './manutencao'

class RegistradorFalso implements RegistradorIpc {
  readonly manipuladores = new Map<
    string,
    (evento: unknown, ...argumentos: unknown[]) => unknown
  >()

  handle(canal: string, ouvinte: (evento: unknown, ...argumentos: unknown[]) => unknown): void {
    this.manipuladores.set(canal, ouvinte)
  }
}

const servicoManutencao = {
  listar: async () => [],
  buscarPorId: async () => {
    throw new Error('não usado')
  },
  criar: async () => {
    throw new Error('não usado')
  },
  atualizar: async () => {
    throw new Error('não usado')
  },
  concluir: async () => {
    throw new Error('não usado')
  },
  inativar: async () => undefined,
} as unknown as ServicoManutencao

const servicoDevolucoes = {
  listar: async () => [],
  buscarPorId: async () => {
    throw new Error('não usado')
  },
  listarPendentes: async () => [],
  calcularMulta: async () => {
    throw new Error('não usado')
  },
  criar: async () => {
    throw new Error('não usado')
  },
  atualizar: async () => {
    throw new Error('não usado')
  },
  inativar: async () => undefined,
} as unknown as ServicoDevolucoes

const resumo = vi.fn(async () => ({
  data: '2026-11-25',
  contadores: {
    reservasHoje: 0,
    devolucoesPendentes: 0,
    devolucoesAtrasadas: 0,
    equipamentosEmManutencao: 0,
  },
  faturamento: { valor: 0, estimado: false },
  devolucoesPendentes: [],
  financeiro: null,
  integracoesIndisponiveis: [],
}))
const servicoDashboard = { resumo } as unknown as ServicoDashboard

describe('handlers auxiliares (ADR 0007)', () => {
  afterEach(() => {
    resumo.mockClear()
    vi.restoreAllMocks()
  })

  it('registra manutenção, pendentes, multa e dashboard com schemas', () => {
    const registrador = new RegistradorFalso()
    const registro = new RegistroIpc(registrador)

    registrarManutencao(registro, servicoManutencao)
    registrarDevolucoes(registro, servicoDevolucoes)
    registrarDashboard(registro, servicoDashboard, { sessao: () => null })

    for (const canal of [
      CANAIS.manutencaoListar,
      CANAIS.manutencaoBuscarPorId,
      CANAIS.manutencaoCriar,
      CANAIS.manutencaoAtualizar,
      CANAIS.manutencaoConcluir,
      CANAIS.manutencaoInativar,
      CANAIS.devolucoesListarPendentes,
      CANAIS.devolucoesCalcularMulta,
      CANAIS.dashboardResumo,
    ]) {
      expect(registrador.manipuladores.has(canal)).toBe(true)
    }
    expect(registro.total).toBeGreaterThanOrEqual(9)
  })

  it('valida payload antes de delegar ao serviço de dashboard', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const registrador = new RegistradorFalso()
    registrarDashboard(new RegistroIpc(registrador), servicoDashboard, { sessao: () => null })
    const tratar = registrador.manipuladores.get(CANAIS.dashboardResumo)
    expect(tratar).toBeDefined()

    await expect(tratar?.(undefined, { data: '25/11/2026' })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.dashboardResumo}`,
    )
    expect(resumo).not.toHaveBeenCalled()
  })

  it('encaminha a data informada ao serviço de dashboard', async () => {
    const registrador = new RegistradorFalso()
    registrarDashboard(new RegistroIpc(registrador), servicoDashboard, { sessao: () => null })
    const tratar = registrador.manipuladores.get(CANAIS.dashboardResumo)

    await tratar?.(undefined, { data: '2026-11-25' })

    expect(resumo).toHaveBeenCalledWith({ data: '2026-11-25' }, undefined)
  })
})
