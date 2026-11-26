import type {
  Cliente,
  CondicaoTempo,
  Equipamento,
  IntegracaoIndisponivel,
  ItemReserva,
  MotivoIndisponibilidade,
  PrevisaoTempoDisponivel,
  Reserva,
  RespostaFeriados,
  RespostaPrevisaoTempo,
  StatusPagamento as StatusPagamentoContrato,
} from '../../../shared/contratos/modelos'
import { ServicoIntegracoes } from './ServicoIntegracoes'
import { vigiarSessao } from './VigilanciaSessao'

/** Tipos locais de apresentação: nenhum deles reexecuta regra de negócio do main. */

export type StatusPagamento = 'pago' | 'pendente' | 'multa' | 'estornado'

export interface PagamentoItem {
  readonly reservaId: number
  readonly status: StatusPagamento
  readonly valor: number
}

export type CondicaoClima = 'ensolarado' | 'nublado' | 'chuva'

export interface PrevisaoTempo {
  readonly condicao: CondicaoClima | null
  readonly descricao: string
  readonly temperaturaMinC: number | null
  readonly temperaturaMaxC: number | null
  readonly ventoKmH: number | null
  readonly recomendacao: string
  readonly disponivel: boolean
  readonly motivo: MotivoIndisponibilidade | null
}

export interface StatusFrota {
  readonly disponivel: number
  readonly reservado: number
  readonly manutencao: number
}

export interface DevolucaoPendente {
  readonly reservaId: number
  readonly clienteId: number
  readonly equipamentoId: number
  readonly cliente: string
  readonly equipamento: string
  readonly prevista: string
  readonly atrasada: boolean
  readonly multa: number
}

export interface Faturamento {
  readonly valor: number
  readonly estimado: boolean
}

export interface DadosDashboard {
  readonly reservas: readonly Reserva[]
  readonly clientes: readonly Cliente[]
  readonly equipamentos: readonly Equipamento[]
  readonly itensReserva: readonly ItemReserva[]
  readonly pagamentos: readonly PagamentoItem[]
  readonly previsao: PrevisaoTempo
  readonly feriadoHoje: string | null
  readonly integracoesIndisponiveis: readonly IntegracaoIndisponivel[]
  readonly frota: StatusFrota
  readonly devolucoes: readonly DevolucaoPendente[]
  readonly faturamento: Faturamento
  /** Fontes que não responderam; as demais são exibidas como dados reais. */
  readonly fontesIndisponiveis: readonly string[]
}

interface Fonte<T> {
  readonly itens: readonly T[]
  readonly falhou: boolean
}

/** Data local de hoje em ISO — usada pela tela para filtrar a agenda. */
export function hojeISO(): string {
  const data = new Date()
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

async function buscar<T>(promessa: Promise<readonly T[]>): Promise<Fonte<T>> {
  try {
    return { itens: await vigiarSessao(promessa), falhou: false }
  } catch {
    return { itens: [], falhou: true }
  }
}

function statusPagamentoLocal(
  status: StatusPagamentoContrato,
  valorMulta: number,
): StatusPagamento {
  if (valorMulta > 0) return 'multa'
  if (status === 'Estornado') return 'estornado'
  if (status === 'Pago') return 'pago'
  return 'pendente'
}

function condicaoDaPrevisao(condicao: CondicaoTempo | null): CondicaoClima | null {
  if (condicao === 'Ensolarado') return 'ensolarado'
  if (condicao === 'Nublado') return 'nublado'
  if (condicao === 'Chuvoso') return 'chuva'
  return null
}

function recomendacaoDaPrevisao(resposta: PrevisaoTempoDisponivel): string {
  if (resposta.condicao === 'Chuvoso') return 'Leve capa de chuva e calçado aderente.'
  if (resposta.condicao === 'Ensolarado') return 'Bom para trilha e ciclismo; use proteção solar.'
  if (resposta.condicao === 'Nublado') return 'Condição estável para atividades ao ar livre.'
  return 'Confira as condições antes de retirar os equipamentos.'
}

function mapearPrevisao(resposta: RespostaPrevisaoTempo): PrevisaoTempo {
  if (resposta.estado === 'indisponivel') {
    return {
      condicao: null,
      descricao: 'Previsão indisponível para esta data.',
      temperaturaMinC: null,
      temperaturaMaxC: null,
      ventoKmH: null,
      recomendacao: 'A locação não fica bloqueada.',
      disponivel: false,
      motivo: resposta.motivo,
    }
  }
  return {
    condicao: condicaoDaPrevisao(resposta.condicao),
    descricao: resposta.descricao ?? 'Sem descrição informada pelo serviço.',
    temperaturaMinC: resposta.temperaturaMinC,
    temperaturaMaxC: resposta.temperaturaMaxC,
    ventoKmH: resposta.ventoKmH,
    recomendacao: recomendacaoDaPrevisao(resposta),
    disponivel: true,
    motivo: null,
  }
}

function calcularFrota(equipamentos: readonly Equipamento[]): StatusFrota {
  const emManutencao = equipamentos.filter(
    (equipamento) =>
      equipamento.estadoConservacao === 'Em Manutenção' ||
      equipamento.disponibilidade === 'Em manutenção',
  ).length
  const disponivel = equipamentos.filter(
    (equipamento) =>
      equipamento.disponibilidade === 'Disponível' &&
      equipamento.estadoConservacao !== 'Em Manutenção',
  ).length
  return {
    disponivel,
    reservado: Math.max(0, equipamentos.length - emManutencao - disponivel),
    manutencao: emManutencao,
  }
}

function montarDevolucoes(
  reservas: readonly Reserva[],
  clientes: readonly Cliente[],
  equipamentos: readonly Equipamento[],
  itens: readonly ItemReserva[],
  pagamentos: readonly PagamentoItem[],
  hoje: string,
): readonly DevolucaoPendente[] {
  const nomesClientes = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]))
  const nomesEquipamentos = new Map(equipamentos.map((item) => [item.id, item.nome]))
  const primeirosItens = new Map<number, number>()
  for (const item of itens) {
    if (!primeirosItens.has(item.reservaId)) primeirosItens.set(item.reservaId, item.equipamentoId)
  }
  const multas = new Map(
    pagamentos
      .filter((item) => item.status === 'multa')
      .map((item) => [item.reservaId, item.valor]),
  )

  return reservas
    .filter(
      (reserva) =>
        (reserva.statusReserva === 'Confirmada' ||
          reserva.statusReserva === 'Pendente') &&
        reserva.dataFim <= hoje,
    )
    .map((reserva) => ({
      reservaId: reserva.id,
      clienteId: reserva.clienteId,
      equipamentoId: primeirosItens.get(reserva.id) ?? 0,
      cliente: nomesClientes.get(reserva.clienteId) ?? `Cliente #${reserva.clienteId}`,
      equipamento:
        nomesEquipamentos.get(primeirosItens.get(reserva.id) ?? -1) ?? 'Item não informado',
      prevista: reserva.dataFim,
      atrasada: reserva.dataFim < hoje,
      multa: multas.get(reserva.id) ?? 0,
    }))
    .sort((a, b) => a.prevista.localeCompare(b.prevista))
}

function calcularFaturamento(
  reservas: readonly Reserva[],
  itens: readonly ItemReserva[],
  pagamentos: readonly PagamentoItem[],
  hoje: string,
): Faturamento {
  const reservasDoDia = reservas.filter(
    (reserva) => reserva.dataInicio === hoje && reserva.statusReserva !== 'Cancelada',
  )
  const idsDoDia = new Set(reservasDoDia.map((reserva) => reserva.id))

  if (pagamentos.length > 0) {
    return {
      valor: pagamentos
        .filter((item) => item.status === 'pago' && idsDoDia.has(item.reservaId))
        .reduce((total, item) => total + item.valor, 0),
      estimado: false,
    }
  }

  const diarias = new Map<number, number>()
  for (const item of itens) {
    diarias.set(item.reservaId, (diarias.get(item.reservaId) ?? 0) + item.valorDiaria)
  }
  return {
    valor: reservasDoDia.reduce((total, reserva) => total + (diarias.get(reserva.id) ?? 0), 0),
    estimado: true,
  }
}

/** Agrega apenas dados persistidos. Falha parcial nunca inventa registro. */
export class DashboardServico {
  private readonly integracoes = new ServicoIntegracoes()

  async carregar(): Promise<DadosDashboard> {
    const hoje = hojeISO()
    const [reservas, clientes, equipamentos, itens, pagamentos, previsao, feriados] =
      await Promise.all([
        buscar(window.electronAPI.reservas.listar()),
        buscar(window.electronAPI.clientes.listar()),
        buscar(window.electronAPI.equipamentos.listar()),
        buscar(window.electronAPI.itensReserva.listar()),
        this.listarPagamentos(),
        this.consultarPrevisao(hoje),
        this.consultarFeriados(hoje),
      ])

    const fontesIndisponiveis: string[] = []
    if (reservas.falhou) fontesIndisponiveis.push('reservas')
    if (clientes.falhou) fontesIndisponiveis.push('clientes')
    if (equipamentos.falhou) fontesIndisponiveis.push('equipamentos')
    if (itens.falhou) fontesIndisponiveis.push('itens de reserva')
    if (pagamentos.falhou) fontesIndisponiveis.push('pagamentos')

    const integracoesIndisponiveis: IntegracaoIndisponivel[] = []
    if (previsao.estado === 'indisponivel') {
      integracoesIndisponiveis.push({ integracao: 'previsao-tempo', motivo: previsao.motivo })
    }
    if (feriados.estado === 'indisponivel') {
      integracoesIndisponiveis.push({ integracao: 'feriados', motivo: feriados.motivo })
    }

    const feriadoHoje =
      feriados.estado === 'disponivel'
        ? (feriados.feriados.find((feriado) => feriado.data === hoje)?.nome ?? null)
        : null

    return {
      reservas: reservas.itens,
      clientes: clientes.itens,
      equipamentos: equipamentos.itens,
      itensReserva: itens.itens,
      pagamentos: pagamentos.itens,
      previsao: mapearPrevisao(previsao),
      feriadoHoje,
      integracoesIndisponiveis,
      frota: calcularFrota(equipamentos.itens),
      devolucoes: montarDevolucoes(
        reservas.itens,
        clientes.itens,
        equipamentos.itens,
        itens.itens,
        pagamentos.itens,
        hoje,
      ),
      faturamento: calcularFaturamento(
        reservas.itens,
        itens.itens,
        pagamentos.itens,
        hoje,
      ),
      fontesIndisponiveis,
    }
  }

  private async listarPagamentos(): Promise<Fonte<PagamentoItem>> {
    return buscar(
      window.electronAPI.pagamentos.listar().then((pagamentos) =>
        pagamentos.map((item) => ({
          reservaId: item.reservaId,
          status: statusPagamentoLocal(item.statusPagamento, item.valorMulta),
          valor: item.valorTotal,
        })),
      ),
    )
  }

  private async consultarPrevisao(data: string): Promise<RespostaPrevisaoTempo> {
    try {
      return await this.integracoes.previsaoTempo({ data })
    } catch {
      return { estado: 'indisponivel', data, motivo: 'SERVICO_FORA' }
    }
  }

  private async consultarFeriados(data: string): Promise<RespostaFeriados> {
    const ano = Number(data.slice(0, 4))
    if (!Number.isInteger(ano)) {
      return { estado: 'indisponivel', ano: 0, motivo: 'PESQUISA_INVALIDA', feriados: [] }
    }
    try {
      return await this.integracoes.feriados({ ano })
    } catch {
      return { estado: 'indisponivel', ano, motivo: 'SERVICO_FORA', feriados: [] }
    }
  }
}
