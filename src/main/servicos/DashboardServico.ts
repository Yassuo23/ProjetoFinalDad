import type {
  IntegracaoIndisponivel,
  ResumoDashboard,
  ResumoDashboardEntrada,
  Sessao,
} from '../../shared/contratos/modelos'
import type {
  RepositorioEquipamentos,
  RepositorioPagamentos,
  RepositorioReservas,
} from '../repositorios/portas'
import { paraErroDominio } from './ErroDeDominio'
import type {
  ServicoDevolucoes,
  ServicoDashboard,
  ServicoFeriados,
  ServicoPrevisaoTempo,
} from './portas'

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

function soma(valores: readonly number[]): number {
  return valores.reduce((total, valor) => total + valor, 0)
}

/**
 * Agregação de leitura do dashboard. Nenhuma integração externa bloqueia o
 * resumo: falhas viram `integracoesIndisponiveis` no próprio retorno (ADR 0007).
 */
export class DashboardServico implements ServicoDashboard {
  constructor(
    private readonly repositorioReservas: RepositorioReservas,
    private readonly repositorioEquipamentos: RepositorioEquipamentos,
    private readonly repositorioPagamentos: RepositorioPagamentos,
    private readonly servicoDevolucoes: ServicoDevolucoes,
    private readonly servicoPrevisaoTempo: ServicoPrevisaoTempo,
    private readonly servicoFeriados: ServicoFeriados,
  ) {}

  async resumo(
    entrada?: ResumoDashboardEntrada,
    perfil?: Sessao['perfil'],
  ): Promise<ResumoDashboard> {
    const data = entrada?.data ?? hoje()

    let reservas: readonly { readonly dataReserva: string }[]
    let equipamentos: readonly {
      readonly estadoConservacao: string
      readonly disponibilidade: string
    }[]
    let pagamentosDia: readonly { readonly valorTotal: number }[]
    let pendentes: Awaited<ReturnType<ServicoDevolucoes['listarPendentes']>>
    try {
      ;[reservas, equipamentos, pagamentosDia, pendentes] = await Promise.all([
        this.repositorioReservas.listar(),
        this.repositorioEquipamentos.listar(),
        this.repositorioPagamentos.listar({ dataInicio: data, dataFim: data }),
        this.servicoDevolucoes.listarPendentes({ data }),
      ])
    } catch (erro) {
      throw paraErroDominio(erro, 'dashboard')
    }

    const financeiro = perfil === 'Administrador' ? await this.financeiro() : null

    return {
      data,
      contadores: {
        reservasHoje: reservas.filter((reserva) => reserva.dataReserva.slice(0, 10) === data)
          .length,
        devolucoesPendentes: pendentes.length,
        devolucoesAtrasadas: pendentes.filter((pendente) => pendente.atrasada).length,
        equipamentosEmManutencao: equipamentos.filter(
          (equipamento) =>
            equipamento.estadoConservacao === 'Em Manutenção' ||
            equipamento.disponibilidade === 'Em manutenção',
        ).length,
      },
      faturamento: {
        valor: soma(pagamentosDia.map((pagamento) => pagamento.valorTotal)),
        estimado: false,
      },
      devolucoesPendentes: pendentes,
      financeiro,
      integracoesIndisponiveis: await this.integracoesIndisponiveis(data),
    }
  }

  private async financeiro(): Promise<{
    readonly aPagar: number
    readonly recebido: number
    readonly multas: number
  }> {
    let pagamentos: readonly {
      readonly statusPagamento: string
      readonly valorTotal: number
      readonly valorMulta: number
    }[]
    try {
      pagamentos = await this.repositorioPagamentos.listar()
    } catch (erro) {
      throw paraErroDominio(erro, 'financeiro')
    }
    return {
      aPagar: soma(
        pagamentos
          .filter((pagamento) => pagamento.statusPagamento === 'Pendente')
          .map((pagamento) => pagamento.valorTotal),
      ),
      recebido: soma(
        pagamentos
          .filter((pagamento) => pagamento.statusPagamento === 'Pago')
          .map((pagamento) => pagamento.valorTotal),
      ),
      multas: soma(pagamentos.map((pagamento) => pagamento.valorMulta)),
    }
  }

  private async integracoesIndisponiveis(data: string): Promise<readonly IntegracaoIndisponivel[]> {
    const resultado: IntegracaoIndisponivel[] = []
    const ano = Number(data.slice(0, 4))

    try {
      const clima = await this.servicoPrevisaoTempo.consultar(data)
      if (clima.estado === 'indisponivel') {
        resultado.push({ integracao: 'previsao-tempo', motivo: clima.motivo })
      }
    } catch {
      resultado.push({ integracao: 'previsao-tempo', motivo: 'SERVICO_FORA' })
    }

    if (Number.isFinite(ano)) {
      try {
        const feriados = await this.servicoFeriados.feriados(ano)
        if (feriados.estado === 'indisponivel') {
          resultado.push({ integracao: 'feriados', motivo: feriados.motivo })
        }
      } catch {
        resultado.push({ integracao: 'feriados', motivo: 'SERVICO_FORA' })
      }
    }

    // CNPJ depende de um número informado pelo usuário; não há consulta no dashboard.
    return resultado
  }
}
