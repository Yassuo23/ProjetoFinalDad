/** Tipos de domínio compartilhados. Só `type`/`interface`: somem no build. */

import type { EstadoEquipamento } from './estados'

export type { EstadoEquipamento } from './estados'

export interface AppInfo {
  name: string
  version: string
  electron: string
  node: string
  platform: string
  arch: string
}

export interface PingPayload {
  message: string
  timestamp: number
}

export interface Categoria {
  id: number
  nome: string
  descricao: string | null
}

export interface Cliente {
  id: number
  nome: string
  email: string | null
  telefone: string | null
  cep: string | null
  logradouro: string | null
  numero: string | null
  complemento: string | null
  bairro: string | null
  cidade: string | null
  uf: string | null
  /** Inativação lógica: cliente com reserva nunca é apagado. */
  ativo: boolean
}

export interface ClientesListarFiltros {
  nome?: string
  ativo?: boolean
}

/** Endereço devolvido pela consulta de CEP; preenchido pelo main, não pelo renderer. */
export interface Endereco {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface ConsultarCepEntrada {
  cep: string
}

export interface ClienteCriarEntrada {
  nome: string
  email?: string | null
  telefone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}

export interface ClienteAtualizarEntrada {
  id: number
  nome?: string
  email?: string | null
  telefone?: string | null
  cep?: string | null
  logradouro?: string | null
  numero?: string | null
  complemento?: string | null
  bairro?: string | null
  cidade?: string | null
  uf?: string | null
}

export interface Equipamento {
  id: number
  nome: string
  categoriaId: number
  precoDiaria: number
  /** Base configurável do cálculo de multa de atraso (P6). */
  valorAquisicao: number
  estado: EstadoEquipamento
  /** Inativação lógica: nunca apague equipamento com histórico de reserva. */
  ativo: boolean
  descricao: string | null
}

export interface EquipamentoListarFiltros {
  categoriaId?: number
  estado?: EstadoEquipamento
}

export interface EquipamentoIdEntrada {
  id: number
}

export interface EquipamentoCriarEntrada {
  nome: string
  categoriaId: number
  precoDiaria: number
  valorAquisicao: number
  descricao?: string | null
}

export interface EquipamentoAtualizarEntrada extends EquipamentoIdEntrada {
  nome?: string
  categoriaId?: number
  precoDiaria?: number
  valorAquisicao?: number
  estado?: EstadoEquipamento
  descricao?: string | null
}

export interface EquipamentoDisponiveisEntrada {
  inicio: string
  fim: string
  categoriaId?: number
}

export type StatusReserva = 'pendente' | 'confirmada' | 'cancelada' | 'concluida'

export interface Reserva {
  id: number
  clienteId: number
  equipamentoId: number
  inicio: string
  fim: string
  status: StatusReserva
}

/**
 * Códigos de erro de domínio. O IPC rejeita com `Error.message === codigo`;
 * o renderer traduz o código para texto amigável, sem detalhe de driver/Zod.
 */
export type CodigoErroDominio =
  | 'EQUIPAMENTO_NAO_ENCONTRADO'
  | 'EQUIPAMENTO_INATIVO'
  | 'CATEGORIA_NAO_ENCONTRADA'
  | 'NOME_DUPLICADO'
  | 'PERIODO_INVALIDO'
  | 'ITEM_INDISPONIVEL'
  | 'RESERVA_JA_CANCELADA'
  | 'URL_NAO_PERMITIDA'
  | 'CLIENTE_NAO_ENCONTRADO'
  | 'EMAIL_DUPLICADO'
  | 'CEP_INVALIDO'
  | 'CEP_NAO_ENCONTRADO'

export interface ErroDominio {
  readonly codigo: CodigoErroDominio
  readonly mensagem: string
}
