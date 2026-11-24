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
  clientesBuscarPorId: 'clientes:buscar-por-id',
  clientesCriar: 'clientes:criar',
  clientesAtualizar: 'clientes:atualizar',
  clientesInativar: 'clientes:inativar',
  clientesConsultarCep: 'clientes:consultar-cep',
  equipamentosListar: 'equipamentos:listar',
  equipamentosBuscarPorId: 'equipamentos:buscar-por-id',
  equipamentosCriar: 'equipamentos:criar',
  equipamentosAtualizar: 'equipamentos:atualizar',
  equipamentosInativar: 'equipamentos:inativar',
  equipamentosListarDisponiveis: 'equipamentos:listar-disponiveis',
  equipamentosVerificarDisponibilidade: 'equipamentos:verificar-disponibilidade',
  reservasListar: 'reservas:listar',
  reservasBuscarPorId: 'reservas:buscar-por-id',
  reservasCriar: 'reservas:criar',
  reservasConfirmar: 'reservas:confirmar',
  reservasCancelar: 'reservas:cancelar',
  reservasPrevisaoTempo: 'reservas:previsao-tempo',
  devolucoesRegistrar: 'devolucoes:registrar',
  devolucoesBuscarPorReserva: 'devolucoes:buscar-por-reserva',
  multasCalcular: 'multas:calcular',
  pagamentosListar: 'pagamentos:listar',
  pagamentosBuscarPorReserva: 'pagamentos:buscar-por-reserva',
  pagamentosRegistrar: 'pagamentos:registrar',
  pagamentosConfirmar: 'pagamentos:confirmar',
  pagamentosEstornar: 'pagamentos:estornar',
} as const

export type Canal = (typeof CANAIS)[keyof typeof CANAIS]
