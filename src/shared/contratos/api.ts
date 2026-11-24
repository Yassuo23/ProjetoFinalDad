import type {
  AppInfo,
  ArquivoSelecionado,
  Categoria,
  CelulaCsv,
  Cliente,
  Devolucao,
  EnderecoViaCep,
  Equipamento,
  Feriado,
  Fornecedor,
  DadosCnpj,
  Manutencao,
  Pagamento,
  PingPayload,
  PrevisaoClima,
  ResultadoBackup,
  ResultadoRestauracao,
  Reserva,
  Usuario,
  ValorMulta,
} from './modelos'

/**
 * Um método por canal nativo. O preload implementa cada um como função
 * específica; nenhum `invoke` genérico é exposto ao renderer.
 */
export interface ApiRecursosNativos {
  abrirArquivo(titulo: string, extensoes: readonly string[]): Promise<ArquivoSelecionado | null>
  salvarArquivo(
    titulo: string,
    nomePadrao: string,
    extensoes: readonly string[],
  ): Promise<string | null>
  backupBanco(destino: string): Promise<ResultadoBackup>
  restaurarBanco(origem: string): Promise<ResultadoRestauracao>
  exportarCsv(
    nomeArquivo: string,
    colunas: readonly string[],
    linhas: readonly (readonly CelulaCsv[])[],
  ): Promise<string | null>
  notificarDevolucaoAtraso(quantidade: number, detalhes: string | null): Promise<void>
  safeStorageDisponivel(): Promise<boolean>
  safeStorageCifrar(texto: string): Promise<string | null>
  safeStorageDecifrar(textoCifrado: string): Promise<string | null>
}

/** Contrato único da ponte renderer → main. */
export interface ApiZenite {
  appInfo(): Promise<AppInfo>
  abrirExterno(url: string): Promise<void>
  onPing(callback: (payload: PingPayload) => void): () => void

  categorias: {
    listar(): Promise<Categoria[]>
    obter?(id: number): Promise<Categoria>
    criar?(nome: string, descricao: string | null): Promise<Categoria>
    atualizar?(id: number, nome: string, descricao: string | null): Promise<Categoria>
    excluir?(id: number): Promise<void>
  }

  equipamentos: {
    listar(): Promise<Equipamento[]>
    obter?(id: number): Promise<Equipamento>
    criar?(
      nome: string,
      categoriaId: number,
      precoDiaria: number,
      estado: Equipamento['estado'],
    ): Promise<Equipamento>
    atualizar?(
      id: number,
      nome: string,
      categoriaId: number,
      precoDiaria: number,
      estado: Equipamento['estado'],
    ): Promise<Equipamento>
    excluir?(id: number): Promise<void>
    disponiveis?(inicio: string, fim: string, categoriaId: number | null): Promise<Equipamento[]>
  }

  clientes: {
    listar(): Promise<Cliente[]>
    obter?(id: number): Promise<Cliente>
    criar?(nome: string, email: string | null, telefone: string | null): Promise<Cliente>
    atualizar?(
      id: number,
      nome: string,
      email: string | null,
      telefone: string | null,
    ): Promise<Cliente>
    excluir?(id: number): Promise<void>
  }

  fornecedores?: {
    listar(): Promise<Fornecedor[]>
    obter?(id: number): Promise<Fornecedor>
    criar?(
      razaoSocial: string,
      cnpj: string | null,
      contato: string | null,
      telefone: string | null,
    ): Promise<Fornecedor>
    atualizar?(
      id: number,
      razaoSocial: string,
      cnpj: string | null,
      contato: string | null,
      telefone: string | null,
    ): Promise<Fornecedor>
    excluir?(id: number): Promise<void>
  }

  reservas: {
    listar(): Promise<Reserva[]>
    obter?(id: number): Promise<Reserva>
    criar?(
      clienteId: number,
      equipamentoId: number,
      inicio: string,
      fim: string,
    ): Promise<Reserva>
    atualizar?(
      id: number,
      clienteId: number,
      equipamentoId: number,
      inicio: string,
      fim: string,
    ): Promise<Reserva>
    confirmar?(id: number): Promise<Reserva>
    cancelar?(id: number): Promise<Reserva>
  }

  devolucoes?: {
    listar(): Promise<Devolucao[]>
    obter?(id: number): Promise<Devolucao>
    registrar?(
      reservaId: number,
      devolvidaEm: string,
      estadoRecebido: Devolucao['estadoRecebido'],
      observacoes: string | null,
    ): Promise<Devolucao>
    calcularMulta?(reservaId: number, devolvidaEm: string): Promise<ValorMulta>
  }

  pagamentos?: {
    listar(): Promise<Pagamento[]>
    obter?(id: number): Promise<Pagamento>
    registrar?(
      reservaId: number,
      valor: number,
      pagoEm: string,
      forma: Pagamento['forma'],
      observacoes: string | null,
    ): Promise<Pagamento>
    baixar?(id: number): Promise<Pagamento>
  }

  manutencoes?: {
    listar(): Promise<Manutencao[]>
    obter?(id: number): Promise<Manutencao>
    abrir?(
      equipamentoId: number,
      fornecedorId: number | null,
      descricao: string,
    ): Promise<Manutencao>
    concluir?(id: number, concluidaEm: string): Promise<Manutencao>
  }

  usuarios?: {
    listar(): Promise<Usuario[]>
    obter?(id: number): Promise<Usuario>
    criar?(nome: string, login: string, perfil: Usuario['perfil']): Promise<Usuario>
    atualizar?(id: number, nome: string, perfil: Usuario['perfil'], ativo: boolean): Promise<Usuario>
    autenticar?(login: string, senha: string): Promise<Usuario>
  }

  integracoes?: {
    buscarCep?(cep: string): Promise<EnderecoViaCep>
    previsaoClima?(data: string, local: string): Promise<PrevisaoClima>
    buscarCnpj?(cnpj: string): Promise<DadosCnpj>
    feriados?(ano: number, uf: string): Promise<Feriado[]>
  }

  /** Opcional até o ED publicar as funções no preload. */
  nativo?: ApiRecursosNativos
}

declare global {
  interface Window {
    electronAPI: ApiZenite
  }
}


