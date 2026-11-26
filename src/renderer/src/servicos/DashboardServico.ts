import type {
  Cliente,
  Equipamento,
  ItemReserva,
  MotivoIndisponibilidade,
  Pagamento,
  Reserva,
  RespostaFeriados,
  RespostaPrevisaoTempo,
  ResumoDashboard,
} from '../../../shared/contratos/modelos'
import { vigiarSessao } from './VigilanciaSessao'

/**
 * Fachada somente leitura do painel. Todo dado vem de `window.electronAPI`;
 * nenhum tipo de apresentação é reinventado aqui e nenhuma falha é engolida.
 * Indisponibilidade de integração é valor de retorno do main (ADR 0008) — a
 * única conversão feita aqui é de uma exceção de canal para o estado explícito
 * `indisponivel`, nunca para dado fictício.
 */
export interface DadosDashboard {
  readonly resumo: ResumoDashboard
  readonly reservas: readonly Reserva[]
  readonly clientes: readonly Cliente[]
  readonly itensReserva: readonly ItemReserva[]
  readonly pagamentos: readonly Pagamento[]
  readonly equipamentos: readonly Equipamento[]
  readonly previsao: RespostaPrevisaoTempo
  readonly feriadoHoje: string | null
}

/** Data local de hoje em ISO — usada para pedir o resumo ao main. */
export function hojeISO(): string {
  const data = new Date()
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function motivoFalhaIntegracao(): MotivoIndisponibilidade {
  return 'SERVICO_FORA'
}

function previsaoSegura(promessa: Promise<RespostaPrevisaoTempo>): Promise<RespostaPrevisaoTempo> {
  return promessa.catch(() => ({
    estado: 'indisponivel' as const,
    data: hojeISO(),
    motivo: motivoFalhaIntegracao(),
  }))
}

function feriadosSeguros(promessa: Promise<RespostaFeriados>): Promise<RespostaFeriados> {
  return promessa.catch(() => ({
    estado: 'indisponivel' as const,
    ano: Number(hojeISO().slice(0, 4)),
    motivo: motivoFalhaIntegracao(),
    feriados: [] as const,
  }))
}

export class DashboardServico {
  async carregar(): Promise<DadosDashboard> {
    const hoje = hojeISO()
    const [resumo, reservas, clientes, itensReserva, pagamentos, equipamentos, previsao, feriados] =
      await Promise.all([
        vigiarSessao(window.electronAPI.dashboard.resumo({ data: hoje })),
        vigiarSessao(window.electronAPI.reservas.listar()),
        vigiarSessao(window.electronAPI.clientes.listar()),
        vigiarSessao(window.electronAPI.itensReserva.listar()),
        vigiarSessao(window.electronAPI.pagamentos.listar()),
        vigiarSessao(window.electronAPI.equipamentos.listar()),
        previsaoSegura(vigiarSessao(window.electronAPI.integracoes.previsaoTempo({ data: hoje }))),
        feriadosSeguros(
          vigiarSessao(window.electronAPI.integracoes.feriados({ ano: Number(hoje.slice(0, 4)) })),
        ),
      ])

    const feriadoHoje =
      feriados.estado === 'disponivel'
        ? (feriados.feriados.find((feriado) => feriado.data === hoje)?.nome ?? null)
        : null

    return {
      resumo,
      reservas,
      clientes,
      itensReserva,
      pagamentos,
      equipamentos,
      previsao,
      feriadoHoje,
    }
  }
}
