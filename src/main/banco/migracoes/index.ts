import type { Migracao } from '../Migrador'
import { migracaoCategorias } from './001-categorias'
import { migracaoLocacao } from './002-locacao'
import { migracaoAuditoriaSoftDelete } from './003-auditoria-soft-delete'
import { migracaoDisponibilidadeEquipamento } from './004-disponibilidade-equipamento'
import { migracaoValorDiariaEquipamento } from './005-valor-diaria-equipamento'

export const MIGRACOES: readonly Migracao[] = [
  migracaoCategorias,
  migracaoLocacao,
  migracaoAuditoriaSoftDelete,
  migracaoDisponibilidadeEquipamento,
  migracaoValorDiariaEquipamento,
]
