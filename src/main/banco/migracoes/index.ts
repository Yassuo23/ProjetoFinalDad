import type { Migracao } from '../Migrador'
import { migracaoCategorias } from './001-categorias'
import { migracaoLocacao } from './002-locacao'
import { migracaoAuditoriaSoftDelete } from './003-auditoria-soft-delete'
import { migracaoDisponibilidadeEquipamento } from './004-disponibilidade-equipamento'
import { migracaoValorDiariaEquipamento } from './005-valor-diaria-equipamento'
import { migracaoAutenticacaoCategorias } from './006-autenticacao-e-auditoria-categorias'
import { migracaoVinculoUsuarioCliente } from './007-vinculo-usuario-cliente'
import { migracaoOrdemManutencao } from './008-ordem-manutencao'

export const MIGRACOES: readonly Migracao[] = [
  migracaoCategorias,
  migracaoLocacao,
  migracaoAuditoriaSoftDelete,
  migracaoDisponibilidadeEquipamento,
  migracaoValorDiariaEquipamento,
  migracaoAutenticacaoCategorias,
  migracaoVinculoUsuarioCliente,
  migracaoOrdemManutencao,
]
