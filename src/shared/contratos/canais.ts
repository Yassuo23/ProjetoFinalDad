/**
 * Nomes de canais IPC — fonte única do contrato.
 *
 * Este arquivo não pode ter imports nem dependências de runtime: ele é
 * empacotado dentro do preload, que roda sob `sandbox: true`.
 * Nenhum literal de canal pode existir fora deste registro (R4).
 */
export const CANAIS = {
  // Fundação / aplicação
  appInfo: 'app:info',
  abrirExterno: 'app:abrir-externo',
  ping: 'app:ping',

  // Categorias (molde de CRUD)
  categoriasListar: 'categorias:listar',
  categoriasObter: 'categorias:obter',
  categoriasCriar: 'categorias:criar',
  categoriasAtualizar: 'categorias:atualizar',
  categoriasExcluir: 'categorias:excluir',

  // Equipamentos
  equipamentosListar: 'equipamentos:listar',
  equipamentosObter: 'equipamentos:obter',
  equipamentosCriar: 'equipamentos:criar',
  equipamentosAtualizar: 'equipamentos:atualizar',
  equipamentosExcluir: 'equipamentos:excluir',
  equipamentosDisponiveis: 'equipamentos:disponiveis',

  // Clientes
  clientesListar: 'clientes:listar',
  clientesObter: 'clientes:obter',
  clientesCriar: 'clientes:criar',
  clientesAtualizar: 'clientes:atualizar',
  clientesExcluir: 'clientes:excluir',

  // Fornecedores
  fornecedoresListar: 'fornecedores:listar',
  fornecedoresObter: 'fornecedores:obter',
  fornecedoresCriar: 'fornecedores:criar',
  fornecedoresAtualizar: 'fornecedores:atualizar',
  fornecedoresExcluir: 'fornecedores:excluir',

  // Reservas
  reservasListar: 'reservas:listar',
  reservasObter: 'reservas:obter',
  reservasCriar: 'reservas:criar',
  reservasAtualizar: 'reservas:atualizar',
  reservasCancelar: 'reservas:cancelar',
  reservasConfirmar: 'reservas:confirmar',

  // Devoluções
  devolucoesListar: 'devolucoes:listar',
  devolucoesObter: 'devolucoes:obter',
  devolucoesRegistrar: 'devolucoes:registrar',
  devolucoesCalcularMulta: 'devolucoes:calcular-multa',

  // Pagamentos
  pagamentosListar: 'pagamentos:listar',
  pagamentosObter: 'pagamentos:obter',
  pagamentosRegistrar: 'pagamentos:registrar',
  pagamentosBaixar: 'pagamentos:baixar',

  // Manutenções
  manutencoesListar: 'manutencoes:listar',
  manutencoesObter: 'manutencoes:obter',
  manutencoesAbrir: 'manutencoes:abrir',
  manutencoesConcluir: 'manutencoes:concluir',

  // Usuários
  usuariosListar: 'usuarios:listar',
  usuariosObter: 'usuarios:obter',
  usuariosCriar: 'usuarios:criar',
  usuariosAtualizar: 'usuarios:atualizar',
  usuariosAutenticar: 'usuarios:autenticar',

  // Integrações externas (propósito real)
  cepBuscar: 'integracoes:cep-buscar',
  climaPrevisao: 'integracoes:clima-previsao',
  cnpjBuscar: 'integracoes:cnpj-buscar',
  feriadosListar: 'integracoes:feriados-listar',

  // Recursos nativos (implementação/adapters do ED no main)
  nativoAbrirArquivo: 'nativo:abrir-arquivo',
  nativoSalvarArquivo: 'nativo:salvar-arquivo',
  nativoBackupBanco: 'nativo:backup-banco',
  nativoRestaurarBanco: 'nativo:restaurar-banco',
  nativoExportarCsv: 'nativo:exportar-csv',
  nativoNotificarDevolucaoAtraso: 'nativo:notificar-devolucao-atraso',
  nativoSafeStorageDisponivel: 'nativo:safe-storage-disponivel',
  nativoSafeStorageCifrar: 'nativo:safe-storage-cifrar',
  nativoSafeStorageDecifrar: 'nativo:safe-storage-decifrar',
} as const

export type Canal = (typeof CANAIS)[keyof typeof CANAIS]
