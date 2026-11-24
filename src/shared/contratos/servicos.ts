/**
 * Portas de serviço consumidas pelos handlers finos.
 *
 * Somente tipos: este arquivo pode ser importado como `import type` por qualquer
 * camada, inclusive pelo preload, sem virar dependência de runtime. Cada método
 * recebe o payload já validado pelo schema do main (R5); nenhuma regra de
 * negócio, SQL ou Electron vive aqui. A implementação fica em
 * `src/main/servicos/<modulo>/`, nas classes dos donos de módulo.
 */
import type {
  AbrirManutencaoPayload,
  AtualizarCategoriaPayload,
  AtualizarClientePayload,
  AtualizarEquipamentoPayload,
  AtualizarFornecedorPayload,
  AtualizarReservaPayload,
  AtualizarUsuarioPayload,
  AutenticarPayload,
  Categoria,
  CepBuscarPayload,
  Cliente,
  ClimaPrevisaoPayload,
  CnpjBuscarPayload,
  ConcluirManutencaoPayload,
  CriarCategoriaPayload,
  CriarClientePayload,
  CriarEquipamentoPayload,
  CriarFornecedorPayload,
  CriarReservaPayload,
  CriarUsuarioPayload,
  DadosCnpj,
  Devolucao,
  EnderecoViaCep,
  Equipamento,
  EquipamentosDisponiveisPayload,
  Feriado,
  FeriadosListarPayload,
  Fornecedor,
  IdPayload,
  Manutencao,
  Pagamento,
  PrevisaoClima,
  RegistrarDevolucaoPayload,
  RegistrarPagamentoPayload,
  Reserva,
  Usuario,
  ValorMulta,
  CalcularMultaPayload,
} from './modelos'

/** Porta do módulo Categorias. */
export interface PortaServicoCategorias {
  listar(): Promise<Categoria[]>
  obter(entrada: IdPayload): Promise<Categoria>
  criar(entrada: CriarCategoriaPayload): Promise<Categoria>
  atualizar(entrada: AtualizarCategoriaPayload): Promise<Categoria>
  excluir(entrada: IdPayload): Promise<void>
}

/** Porta do módulo Equipamentos. */
export interface PortaServicoEquipamentos {
  listar(): Promise<Equipamento[]>
  obter(entrada: IdPayload): Promise<Equipamento>
  criar(entrada: CriarEquipamentoPayload): Promise<Equipamento>
  atualizar(entrada: AtualizarEquipamentoPayload): Promise<Equipamento>
  excluir(entrada: IdPayload): Promise<void>
  disponiveis(entrada: EquipamentosDisponiveisPayload): Promise<Equipamento[]>
}

/** Porta do módulo Clientes. */
export interface PortaServicoClientes {
  listar(): Promise<Cliente[]>
  obter(entrada: IdPayload): Promise<Cliente>
  criar(entrada: CriarClientePayload): Promise<Cliente>
  atualizar(entrada: AtualizarClientePayload): Promise<Cliente>
  excluir(entrada: IdPayload): Promise<void>
}

/** Porta do módulo Fornecedores. */
export interface PortaServicoFornecedores {
  listar(): Promise<Fornecedor[]>
  obter(entrada: IdPayload): Promise<Fornecedor>
  criar(entrada: CriarFornecedorPayload): Promise<Fornecedor>
  atualizar(entrada: AtualizarFornecedorPayload): Promise<Fornecedor>
  excluir(entrada: IdPayload): Promise<void>
}

/** Porta do módulo Reservas — a política de locação fica na implementação. */
export interface PortaServicoReservas {
  listar(): Promise<Reserva[]>
  obter(entrada: IdPayload): Promise<Reserva>
  criar(entrada: CriarReservaPayload): Promise<Reserva>
  atualizar(entrada: AtualizarReservaPayload): Promise<Reserva>
  confirmar(entrada: IdPayload): Promise<Reserva>
  cancelar(entrada: IdPayload): Promise<Reserva>
}

/** Porta do módulo Devoluções. */
export interface PortaServicoDevolucoes {
  listar(): Promise<Devolucao[]>
  obter(entrada: IdPayload): Promise<Devolucao>
  registrar(entrada: RegistrarDevolucaoPayload): Promise<Devolucao>
  calcularMulta(entrada: CalcularMultaPayload): Promise<ValorMulta>
}

/** Porta do módulo Pagamentos. */
export interface PortaServicoPagamentos {
  listar(): Promise<Pagamento[]>
  obter(entrada: IdPayload): Promise<Pagamento>
  registrar(entrada: RegistrarPagamentoPayload): Promise<Pagamento>
  baixar(entrada: IdPayload): Promise<Pagamento>
}

/** Porta do módulo Manutenções. */
export interface PortaServicoManutencoes {
  listar(): Promise<Manutencao[]>
  obter(entrada: IdPayload): Promise<Manutencao>
  abrir(entrada: AbrirManutencaoPayload): Promise<Manutencao>
  concluir(entrada: ConcluirManutencaoPayload): Promise<Manutencao>
}

/** Porta do módulo Usuários. */
export interface PortaServicoUsuarios {
  listar(): Promise<Usuario[]>
  obter(entrada: IdPayload): Promise<Usuario>
  criar(entrada: CriarUsuarioPayload): Promise<Usuario>
  atualizar(entrada: AtualizarUsuarioPayload): Promise<Usuario>
  autenticar(entrada: AutenticarPayload): Promise<Usuario>
}

/** Porta das consultas a APIs externas; DTOs normalizados, nunca JSON bruto. */
export interface PortaServicoIntegracoes {
  cepBuscar(entrada: CepBuscarPayload): Promise<EnderecoViaCep>
  climaPrevisao(entrada: ClimaPrevisaoPayload): Promise<PrevisaoClima>
  cnpjBuscar(entrada: CnpjBuscarPayload): Promise<DadosCnpj>
  feriadosListar(entrada: FeriadosListarPayload): Promise<Feriado[]>
}
