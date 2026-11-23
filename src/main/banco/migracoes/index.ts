import type { Migracao } from '../Migrador'
import { migracaoCategorias } from './001-categorias'

export const MIGRACOES: readonly Migracao[] = [migracaoCategorias]
