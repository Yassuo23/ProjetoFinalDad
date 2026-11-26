import { describe, expect, it } from 'vitest'
import type { DevolucaoPendente } from '../../shared/contratos/modelos'
import type {
  RepositorioEquipamentos,
  RepositorioPagamentos,
  RepositorioReservas,
} from '../repositorios/portas'
import { DashboardServico } from './DashboardServico'
import type {
  ServicoDevolucoes,
  ServicoFeriados,
  ServicoPrevisaoTempo,
} from './portas'

const DATA = '2026-11-25'

const pendente: DevolucaoPendente = {
  reservaId: 7,
  clienteId: 3,
  clienteNome: 'Carla',
  equipamentoId: 11,
  equipamentoNome: 'Caiaque Duplo',
  dataPrevista: '2026-11-20',
  status: 'Atrasada',
  atrasada: true,
  diasAtraso: 5,
  valorMultaEstimado: 100,
}

function servico(climaIndisponivel = false): DashboardServico {
  const reservas = {
    listar: async () => [{ dataReserva: `${DATA}T10:00:00.000Z` }],
  } as unknown as RepositorioReservas
  const equipamentos = {
    listar: async () => [
      { estadoConservacao: 'Em Manutenção', disponibilidade: 'Em manutenção' },
      { estadoConservacao: 'Bom', disponibilidade: 'Disponível' },
    ],
  } as unknown as RepositorioEquipamentos
  const pagamentos = {
    listar: async () => [
      { statusPagamento: 'Pago', valorTotal: 200, valorMulta: 20 },
      { statusPagamento: 'Pendente', valorTotal: 80, valorMulta: 0 },
    ],
  } as unknown as RepositorioPagamentos
  const devolucoes = {
    listarPendentes: async () => [pendente],
  } as unknown as ServicoDevolucoes
  const previsao: ServicoPrevisaoTempo = {
    consultar: async () =>
      climaIndisponivel
        ? { estado: 'indisponivel', data: DATA, motivo: 'CREDENCIAL_AUSENTE' }
        : {
            estado: 'disponivel',
            data: DATA,
            condicao: 'Ensolarado',
            descricao: null,
            temperaturaMinC: null,
            temperaturaMaxC: null,
            ventoKmH: null,
          },
  }
  const feriados: ServicoFeriados = {
    feriados: async (ano) => ({ estado: 'disponivel', ano, feriados: [] }),
  }

  const dashboard = new DashboardServico(
    reservas,
    equipamentos,
    pagamentos,
    devolucoes,
    previsao,
    feriados,
  )
  return dashboard
}

describe('DashboardServico', () => {
  it('agrega contadores, faturamento e pendentes na data informada', async () => {
    const resumo = await servico().resumo({ data: DATA }, 'Administrador')

    expect(resumo).toMatchObject({
      data: DATA,
      contadores: {
        reservasHoje: 1,
        devolucoesPendentes: 1,
        devolucoesAtrasadas: 1,
        equipamentosEmManutencao: 1,
      },
      faturamento: { valor: 280, estimado: false },
      financeiro: { aPagar: 80, recebido: 200, multas: 20 },
      integracoesIndisponiveis: [],
    })
    expect(resumo.devolucoesPendentes).toEqual([pendente])
  })

  it('oculta finanças do atendente', async () => {
    const resumo = await servico().resumo({ data: DATA }, 'Atendente')

    expect(resumo.financeiro).toBeNull()
    expect(resumo.contadores.reservasHoje).toBe(1)
  })

  it('devolve indisponibilidade sem bloquear o resumo', async () => {
    const resumo = await servico(true).resumo({ data: DATA })

    expect(resumo.integracoesIndisponiveis).toEqual([
      { integracao: 'previsao-tempo', motivo: 'CREDENCIAL_AUSENTE' },
    ])
    expect(resumo.faturamento.valor).toBe(280)
  })
})
