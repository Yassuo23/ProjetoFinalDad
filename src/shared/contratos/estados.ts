/**
 * Estados de um equipamento — fonte única para o tipo e para o schema Zod.
 * Arquivo sem imports: seguro para qualquer ambiente (inclusive o preload).
 */
export const ESTADOS_EQUIPAMENTO = [
  'disponivel',
  'em_manutencao',
  'baixado',
  'reservado',
] as const

export type EstadoEquipamento = (typeof ESTADOS_EQUIPAMENTO)[number]
