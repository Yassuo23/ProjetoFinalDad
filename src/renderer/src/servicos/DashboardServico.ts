import type { Cliente, Equipamento, Reserva } from '../../../shared/contratos/modelos'
import { EquipamentoServico } from './EquipamentoServico'

/** Tipos locais do renderer: o contrato compartilhado ainda não cobre pagamento/clima/frota. */

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
  /** `null` quando o contrato não informa manutenção (dados reais). */
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

function clienteExemplo(
  id: number,
  nome: string,
  email: string,
  telefone: string,
): Cliente {
  return {
    id,
    nome,
    email,
    telefone,
    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    uf: null,
    ativo: true,
  }
}

function reservaExemplo(
  id: number,
  clienteId: number,
  equipamentoId: number,
  inicio: string,
  fim: string,
  status: Reserva['status'],
): Reserva {
  return { id, clienteId, equipamentoId, inicio, fim, status, localAtividade: null, criadoEm: diaISO(-7) }
}

const CLIENTES_EXEMPLO: readonly Cliente[] = [
  clienteExemplo(201, 'Ana Souza', 'ana@exemplo.test', '(11) 98888-0001'),
  clienteExemplo(202, 'Carlos Lima', 'carlos@exemplo.test', '(21) 97777-0002'),
  clienteExemplo(203, 'Joana Ribeiro', 'joana@exemplo.test', '(31) 96666-0003'),
  clienteExemplo(204, 'Marcos Alves', 'marcos@exemplo.test', '(41) 95555-0004'),
  clienteExemplo(205, 'Paula Mendes', 'paula@exemplo.test', '(51) 94444-0005'),
]

const RESERVAS_EXEMPLO: readonly Reserva[] = [
  reservaExemplo(1001, 201, 101, diaISO(0), diaISO(2), 'confirmada'),
  reservaExemplo(1002, 202, 103, diaISO(0), diaISO(1), 'pendente'),
  reservaExemplo(1003, 203, 105, diaISO(-1), diaISO(0), 'confirmada'),
  reservaExemplo(1004, 204, 104, diaISO(0), diaISO(3), 'confirmada'),
  reservaExemplo(1005, 205, 107, diaISO(-2), diaISO(-1), 'confirmada'),
  reservaExemplo(1006, 201, 102, diaISO(0), diaISO(1), 'cancelada'),
  reservaExemplo(1007, 202, 106, diaISO(-1), diaISO(1), 'confirmada'),
  reservaExemplo(1008, 203, 101, diaISO(0), diaISO(1), 'pendente'),
]

/** Pagamentos/multas são ilustrativos: ainda não existe canal nem modelo no contrato. */
const PAGAMENTOS_EXEMPLO: readonly PagamentoItem[] = [
  { reservaId: 1001, status: 'pago', valor: 270 },
  { reservaId: 1002, status: 'pendente', valor: 280 },
  { reservaId: 1003, status: 'pago', valor: 75 },
  { reservaId: 1004, status: 'pago', valor: 480 },
  { reservaId: 1005, status: 'multa', valor: 55 },
  { reservaId: 1008, status: 'pendente', valor: 180 },
]

/** Sem endpoint de clima: este valor é sempre de exemplo e identificado na tela. */
const PREVISAO_EXEMPLO: PrevisaoTempo = {
  condicao: 'nublado',
  descricao: 'Parcialmente nublado',
  temperaturaC: 24,
  ventoKmH: 12,
  recomendacao: 'Bom para trilha e ciclismo',
}

function calcularFrota(equipamentos: readonly Equipamento[], dadosDeExemplo: boolean): StatusFrota {
  const disponivel = equipamentos.filter(
    (equipamento) => equipamento.ativo && equipamento.estado === 'disponivel',
  ).length
  return {
    disponivel,
    reservado: equipamentos.length - disponivel,
    manutencao: dadosDeExemplo ? 1 : null,
  }
}

function montarDevolucoes(
  reservas: readonly Reserva[],
  clientes: readonly Cliente[],
  equipamentos: readonly Equipamento[],
  pagamentos: readonly PagamentoItem[],
  hoje: string,
): readonly DevolucaoPendente[] {
  const nomesClientes = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]))
  const nomesEquipamentos = new Map(equipamentos.map((item) => [item.id, item.nome]))
  const multas = new Map(
    pagamentos
      .filter((item) => item.status === 'multa')
      .map((item) => [item.reservaId, item.valor]),
  )

  return reservas
    .filter(
      (reserva) =>
        (reserva.status === 'confirmada' || reserva.status === 'pendente') && reserva.fim <= hoje,
    )
    .map((reserva) => ({
      reservaId: reserva.id,
      clienteId: reserva.clienteId,
      equipamentoId: reserva.equipamentoId,
      cliente: nomesClientes.get(reserva.clienteId) ?? `Cliente #${reserva.clienteId}`,
      equipamento: nomesEquipamentos.get(reserva.equipamentoId) ?? `Item #${reserva.equipamentoId}`,
      prevista: reserva.fim,
      atrasada: reserva.fim < hoje,
      multa: multas.get(reserva.id) ?? 0,
    }))
    .sort((a, b) => a.prevista.localeCompare(b.prevista))
}

function calcularFaturamento(
  reservas: readonly Reserva[],
  equipamentos: readonly Equipamento[],
  pagamentos: readonly PagamentoItem[],
  hoje: string,
  usarPagamentos: boolean,
): Faturamento {
  const reservasDoDia = reservas.filter(
    (reserva) => reserva.inicio === hoje && reserva.status !== 'cancelada',
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

  // Sem canal de pagamentos: estimativa por diária dos itens das reservas de hoje.
  const precos = new Map(equipamentos.map((item) => [item.id, item.precoDiaria]))
  return {
    valor: reservasDoDia.reduce(
      (total, reserva) => total + (precos.get(reserva.equipamentoId) ?? 0),
      0,
    ),
    estimado: true,
  }
}

/** Agrega as três fontes disponíveis e aplica fallback tipado quando uma falha. */
export class DashboardServico {
  private readonly equipamentoServico = new EquipamentoServico()

  async carregar(): Promise<DadosDashboard> {
    const [reservas, clientes, resultadoEquipamentos] = await Promise.all([
      this.listarReservas(),
      this.listarClientes(),
      this.equipamentoServico.listar(),
    ])

    const dadosDeExemplo =
      reservas === null || clientes === null || resultadoEquipamentos.dadosDeExemplo
    const reservasAtivas: readonly Reserva[] = dadosDeExemplo ? RESERVAS_EXEMPLO : (reservas ?? [])
    const clientesAtivos: readonly Cliente[] = dadosDeExemplo ? CLIENTES_EXEMPLO : (clientes ?? [])
    const equipamentosAtivos = resultadoEquipamentos.itens
    const pagamentosAtivos: readonly PagamentoItem[] = dadosDeExemplo ? PAGAMENTOS_EXEMPLO : []
    const hoje = diaISO(0)

    return {
      reservas: reservasAtivas,
      clientes: clientesAtivos,
      equipamentos: equipamentosAtivos,
      pagamentos: pagamentosAtivos,
      previsao: PREVISAO_EXEMPLO,
      previsaoExemplo: true,
      frota: calcularFrota(equipamentosAtivos, dadosDeExemplo),
      devolucoes: montarDevolucoes(
        reservasAtivas,
        clientesAtivos,
        equipamentosAtivos,
        pagamentosAtivos,
        hoje,
      ),
      faturamento: calcularFaturamento(
        reservasAtivas,
        equipamentosAtivos,
        pagamentosAtivos,
        hoje,
        dadosDeExemplo,
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
}
