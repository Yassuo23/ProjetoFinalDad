import type { Migracao } from '../Migrador'
import { migracaoCategorias } from './001-categorias'
import { migracaoEquipamentos } from './002-equipamentos'
import { migracaoClientes } from './003-clientes'

export const MIGRACOES: readonly Migracao[] = [
  migracaoCategorias,
  migracaoEquipamentos,
  migracaoClientes,
]
