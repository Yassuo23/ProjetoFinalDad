import type {
  Cliente,
  Equipamento,
  ItemReserva,
  Reserva,
} from '../../../shared/contratos/modelos'
import { EquipamentoServico } from './EquipamentoServico'

/** Tipos locais do renderer: clima e KPIs ainda são apresentação, não contrato. */

export type StatusPagamento = 'pago' | 'pendente' | 'multa'

export interface PagamentoItem {
  readonly reservaId: number
  readonly status: StatusPagamento
  readonly valor: number
}

export type CondicaoClima = 'ensolarado' | 'nublado' | 'chuva'

export interface PrevisaoTempo {
  readonly condicao: CondicaoClima
  readonly descricao: string
  readonly temperaturaC: number
  readonly ventoKmH: number
  readonly recomendacao: string
}

export interface StatusFrota {
  readonly disponivel: number
  readonly reservado: number
  readonly manutencao: number | null
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
  readonly previsaoExemplo: boolean
  readonly frota: StatusFrota
  readonly devolucoes: readonly DevolucaoPendente[]
  readonly faturamento: Faturamento
  readonly dadosDeExemplo: boolean
}

function diaISO(deslocamento = 0): string {
  const data = new Date()
  data.setDate(data.getDate() + deslocamento)
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

/** Data local de hoje em ISO — usada pela tela para filtrar a agenda. */
export function hojeISO(): string {
  return diaISO(0)
}

const ATUALIZADO_EXEMPLO = '2026-01-01T00:00:00.000Z'

const CLIENTES_EXEMPLO: readonly Cliente[] = [
  {
    id: 201,
    nome: 'Ana Souza',
    cpf: '111.444.777-35',
    email: 'ana@exemplo.test',
    telefone: '(11) 98888-0001',
    cep: '01310-100',
    logradouro: 'Av. Paulista',
    numero: '1000',
    complemento: null,
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    uf: 'SP',
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 202,
    nome: 'Carlos Lima',
    cpf: '222.333.444-05',
    email: 'carlos@exemplo.test',
    telefone: '(21) 97777-0002',
    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    uf: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
]

const RESERVAS_EXEMPLO: readonly Reserva[] = [
  {
    id: 1001,
    clienteId: 201,
    dataReserva: `${diaISO(-1)}T12:00:00.000Z`,
    dataInicio: diaISO(0),
    dataFim: diaISO(2),
    statusReserva: 'Confirmada',
    previsaoTempo: 'Nublado, 24 °C',
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 1002,
    clienteId: 202,
    dataReserva: `${diaISO(0)}T09:00:00.000Z`,
    dataInicio: diaISO(0),
    dataFim: diaISO(1),
    statusReserva: 'Pendente',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 1003,
    clienteId: 201,
    dataReserva: `${diaISO(-3)}T15:00:00.000Z`,
    dataInicio: diaISO(-1),
    dataFim: diaISO(0),
    statusReserva: 'Confirmada',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 1004,
    clienteId: 202,
    dataReserva: `${diaISO(-2)}T10:00:00.000Z`,
    dataInicio: diaISO(-2),
    dataFim: diaISO(-1),
    statusReserva: 'Cancelada',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
]

const ITENS_RESERVA_EXEMPLO: readonly ItemReserva[] = [
  { reservaId: 1001, equipamentoId: 101, valorDiaria: 90 },
  { reservaId: 1002, equipamentoId: 103, valorDiaria: 140 },
  { reservaId: 1003, equipamentoId: 105, valorDiaria: 75 },
  { reservaId: 1004, equipamentoId: 101, valorDiaria: 90 },
]

/** Pagamentos/multas são ilustrativos quando o banco não responde. */
const PAGAMENTOS_EXEMPLO: readonly PagamentoItem[] = [
  { reservaId: 1001, status: 'pago', valor: 180 },
  { reservaId: 1002, status: 'pendente', valor: 140 },
  { reservaId: 1003, status: 'multa', valor: 95 },
]

/** Sem endpoint de clima no renderer: este valor é sempre identificado na tela. */
const PREVISAO_EXEMPLO: PrevisaoTempo = {
  condicao: 'nublado',
  descricao: 'Parcialmente nublado',
  temperaturaC: 24,
  ventoKmH: 12,
  recomendacao: 'Bom para trilha e ciclismo',
}

function statusPagamentoLocal(
  status: 'Pendente' | 'Pago' | 'Estornado',
  valorMulta: number,
): StatusPagamento {
  if (valorMulta > 0) return 'multa'
  if (status === 'Pago') return 'pago'
  return 'pendente'
}

function calcularFrota(
  equipamentos: readonly Equipamento[],
  dadosDeExemplo: boolean,
): StatusFrota {
  const manutencao = equipamentos.filter(
    (equipamento) => equipamento.estadoConservacao === 'Em Manutenção',
  ).length
  const disponivel = equipamentos.length - manutencao
  return {
    disponivel,
    reservado: 0,
    manutencao: dadosDeExemplo || manutencao > 0 ? manutencao : null,
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
  usarPagamentos: boolean,
): Faturamento {
  const reservasDoDia = reservas.filter(
    (reserva) => reserva.dataInicio === hoje && reserva.statusReserva !== 'Cancelada',
  )
  const idsDoDia = new Set(reservasDoDia.map((reserva) => reserva.id))

  if (usarPagamentos && pagamentos.length > 0) {
    return {
      valor: pagamentos
        .filter((item) => item.status === 'pago' && idsDoDia.has(item.reservaId))
        .reduce((total, item) => total + item.valor, 0),
      estimado: false,
    }
  }

  // Sem pagamentos confirmados: estimativa pelas diárias dos itens reservados.
  const diarias = new Map<number, number>()
  for (const item of itens) {
    diarias.set(item.reservaId, (diarias.get(item.reservaId) ?? 0) + item.valorDiaria)
  }
  return {
    valor: reservasDoDia.reduce((total, reserva) => total + (diarias.get(reserva.id) ?? 0), 0),
    estimado: true,
  }
}

/** Agrega as fontes do banco e aplica fallback tipado quando uma falha. */
export class DashboardServico {
  private readonly equipamentoServico = new EquipamentoServico()

  async carregar(): Promise<DadosDashboard> {
    const [reservas, clientes, resultadoEquipamentos, itens, pagamentos] = await Promise.all([
      this.listarReservas(),
      this.listarClientes(),
      this.equipamentoServico.listar(),
      this.listarItens(),
      this.listarPagamentos(),
    ])

    const dadosDeExemplo =
      reservas === null ||
      clientes === null ||
      itens === null ||
      pagamentos === null ||
      resultadoEquipamentos.dadosDeExemplo
    const reservasAtivas: readonly Reserva[] = dadosDeExemplo ? RESERVAS_EXEMPLO : (reservas ?? [])
    const clientesAtivos: readonly Cliente[] = dadosDeExemplo ? CLIENTES_EXEMPLO : (clientes ?? [])
    const equipamentosAtivos = resultadoEquipamentos.itens
    const itensAtivos: readonly ItemReserva[] = dadosDeExemplo
      ? ITENS_RESERVA_EXEMPLO
      : (itens ?? [])
    const pagamentosAtivos: readonly PagamentoItem[] = dadosDeExemplo
      ? PAGAMENTOS_EXEMPLO
      : (pagamentos ?? [])
    const hoje = diaISO(0)

    return {
      reservas: reservasAtivas,
      clientes: clientesAtivos,
      equipamentos: equipamentosAtivos,
      itensReserva: itensAtivos,
      pagamentos: pagamentosAtivos,
      previsao: PREVISAO_EXEMPLO,
      previsaoExemplo: true,
      frota: calcularFrota(equipamentosAtivos, dadosDeExemplo),
      devolucoes: montarDevolucoes(
        reservasAtivas,
        clientesAtivos,
        equipamentosAtivos,
        itensAtivos,
        pagamentosAtivos,
        hoje,
      ),
      faturamento: calcularFaturamento(
        reservasAtivas,
        itensAtivos,
        pagamentosAtivos,
        hoje,
        !dadosDeExemplo,
      ),
      dadosDeExemplo,
    }
  }

  private async listarReservas(): Promise<readonly Reserva[] | null> {
    try {
      return await window.electronAPI.reservas.listar()
    } catch {
      return null
    }
  }

  private async listarClientes(): Promise<readonly Cliente[] | null> {
    try {
      return await window.electronAPI.clientes.listar()
    } catch {
      return null
    }
  }

  private async listarItens(): Promise<readonly ItemReserva[] | null> {
    try {
      return await window.electronAPI.itensReserva.listar()
    } catch {
      return null
    }
  }

  private async listarPagamentos(): Promise<readonly PagamentoItem[] | null> {
    try {
      const pagamentos = await window.electronAPI.pagamentos.listar()
      return pagamentos.map((item) => ({
        reservaId: item.reservaId,
        status: statusPagamentoLocal(item.statusPagamento, item.valorMulta),
        valor: item.valorTotal,
      }))
    } catch {
      return null
    }
  }
}
