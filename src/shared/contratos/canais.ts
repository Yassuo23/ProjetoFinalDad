/**
 * Nomes de canais IPC — fonte única do contrato.
 *
 * Este arquivo não pode ter imports nem dependências de runtime: ele é
 * empacotado dentro do preload, que roda sob `sandbox: true`.
 */
export const CANAIS = {
  appInfo: 'app:info',
  abrirExterno: 'app:abrir-externo',
  ping: 'app:ping',
  categoriasListar: 'categorias:listar',
  clientesListar: 'clientes:listar',
  equipamentosListar: 'equipamentos:listar',
  reservasListar: 'reservas:listar',
  stripeCriarCheckout: 'stripe:criar-checkout',
} as const

export type Canal = (typeof CANAIS)[keyof typeof CANAIS]
