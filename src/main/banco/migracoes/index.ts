import type { Migracao } from '../Migrador'
import { migracaoCategorias } from './001-categorias'
import { migracaoEquipamentos } from './002-equipamentos'

export const MIGRACOES: readonly Migracao[] = [migracaoCategorias, migracaoEquipamentos]
