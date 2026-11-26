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

  // Catálogo auxiliar (mantido pelas migrações da fundação).
  categoriasListar: 'categorias:listar',

  // Fornecedores.
  fornecedoresListar: 'fornecedores:listar',
  fornecedoresBuscarPorId: 'fornecedores:buscar-por-id',
  fornecedoresCriar: 'fornecedores:criar',
  fornecedoresAtualizar: 'fornecedores:atualizar',
  fornecedoresInativar: 'fornecedores:inativar',

  // Clientes.
  clientesListar: 'clientes:listar',
  clientesBuscarPorId: 'clientes:buscar-por-id',
  clientesCriar: 'clientes:criar',
  clientesAtualizar: 'clientes:atualizar',
  clientesInativar: 'clientes:inativar',
  clientesBuscarCep: 'clientes:buscar-cep',

  // Equipamentos.
  equipamentosListar: 'equipamentos:listar',
  equipamentosBuscarPorId: 'equipamentos:buscar-por-id',
  equipamentosCriar: 'equipamentos:criar',
  equipamentosAtualizar: 'equipamentos:atualizar',
  equipamentosInativar: 'equipamentos:inativar',
  equipamentosListarDisponiveis: 'equipamentos:listar-disponiveis',

  // Reservas.
  reservasListar: 'reservas:listar',
  reservasBuscarPorId: 'reservas:buscar-por-id',
  reservasCriar: 'reservas:criar',
  reservasAtualizar: 'reservas:atualizar',
  reservasInativar: 'reservas:inativar',

  // Itens de reserva (chave composta; exclusão física é segura).
  itensReservaListar: 'itens-reserva:listar',
  itensReservaBuscarPorId: 'itens-reserva:buscar-por-id',
  itensReservaCriar: 'itens-reserva:criar',
  itensReservaAtualizar: 'itens-reserva:atualizar',
  itensReservaRemover: 'itens-reserva:remover',

  // Pagamentos.
  pagamentosListar: 'pagamentos:listar',
  pagamentosBuscarPorId: 'pagamentos:buscar-por-id',
  pagamentosCriar: 'pagamentos:criar',
  pagamentosAtualizar: 'pagamentos:atualizar',
  pagamentosInativar: 'pagamentos:inativar',

  // Devoluções.
  devolucoesListar: 'devolucoes:listar',
  devolucoesBuscarPorId: 'devolucoes:buscar-por-id',
  devolucoesCriar: 'devolucoes:criar',
  devolucoesAtualizar: 'devolucoes:atualizar',
  devolucoesInativar: 'devolucoes:inativar',

  // Autenticação e sessão (ADR 0007; auto-cadastro pela ADR 0009).
  authEntrar: 'auth:entrar',
  authSair: 'auth:sair',
  authSessaoAtual: 'auth:sessao-atual',
  authBootstrap: 'auth:bootstrap',
  /** Auto-cadastro público: o perfil Cliente é fixado no main, nunca no payload. */
  authCadastrarCliente: 'auth:cadastrar-cliente',

  // Usuários — somente administrador (ADR 0007).
  usuariosListar: 'usuarios:listar',
  usuariosCriar: 'usuarios:criar',
  usuariosAtualizar: 'usuarios:atualizar',
  usuariosAlterarSenha: 'usuarios:alterar-senha',

  // Catálogo auxiliar — CRUD completo; `categoriasListar` já existia.
  categoriasBuscarPorId: 'categorias:buscar-por-id',
  categoriasCriar: 'categorias:criar',
  categoriasAtualizar: 'categorias:atualizar',
  categoriasInativar: 'categorias:inativar',

  // Manutenção como entidade própria (ADR 0007).
  manutencaoListar: 'manutencao:listar',
  manutencaoBuscarPorId: 'manutencao:buscar-por-id',
  manutencaoCriar: 'manutencao:criar',
  manutencaoAtualizar: 'manutencao:atualizar',
  manutencaoInativar: 'manutencao:inativar',
  manutencaoConcluir: 'manutencao:concluir',

  // Integrações — um canal por serviço externo; CEP já existe em `clientesBuscarCep`.
  integracoesPrevisaoTempo: 'integracoes:previsao-tempo',
  integracoesCnpj: 'integracoes:cnpj',
  integracoesFeriados: 'integracoes:feriados',

  // Agregações e cálculos de apoio ao renderer (ADR 0007).
  dashboardResumo: 'dashboard:resumo',
  devolucoesListarPendentes: 'devolucoes:listar-pendentes',
  devolucoesCalcularMulta: 'devolucoes:calcular-multa',
} as const

export type Canal = (typeof CANAIS)[keyof typeof CANAIS]
