import type { Migracao } from '../Migrador'
import { migracaoCategorias } from './001-categorias'
import { migracaoEquipamentos } from './002-equipamentos'
import { migracaoClientes } from './003-clientes'
import { migracaoReservas } from './004-reservas'
import { migracaoDevolucoes } from './005-devolucoes'
import { migracaoPagamentos } from './006-pagamentos'

export const MIGRACOES: readonly Migracao[] = [
  migracaoCategorias,
  migracaoEquipamentos,
  migracaoClientes,
  migracaoReservas,
  migracaoDevolucoes,
  migracaoPagamentos,
]
