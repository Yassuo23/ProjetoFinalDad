import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClientesListarFiltros,
} from '../../shared/contratos/modelos'
import type { RepositorioClientes } from '../repositorios/ClienteRepositorio'
import { ErroDeDominio } from './ErroDominio'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoClientes {
  listar(filtros?: ClientesListarFiltros): Cliente[]
  buscarPorId(id: number): Cliente
  criar(dados: ClienteCriarEntrada): Cliente
  atualizar(dados: ClienteAtualizarEntrada): Cliente
  inativar(id: number): void
}

/** Regras de negócio do cliente. Não conhece IPC, janela nem SQL. */
export class ClienteServico implements ServicoClientes {
  constructor(private readonly clientes: RepositorioClientes) {}

  listar(filtros?: ClientesListarFiltros): Cliente[] {
    return this.clientes.listar(filtros)
  }

  buscarPorId(id: number): Cliente {
    const cliente = this.clientes.buscarPorId(id)
    if (!cliente) {
      throw new ErroDeDominio('CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.')
    }
    return cliente
  }

  criar(dados: ClienteCriarEntrada): Cliente {
    this.validarEmail(dados.email)
    return this.clientes.criar(dados)
  }

  atualizar(dados: ClienteAtualizarEntrada): Cliente {
    this.buscarPorId(dados.id)
    this.validarEmail(dados.email, dados.id)

    const atualizado = this.clientes.atualizar(dados)
    if (!atualizado) {
      throw new ErroDeDominio('CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.')
    }
    return atualizado
  }

  inativar(id: number): void {
    if (!this.clientes.inativar(id)) {
      throw new ErroDeDominio('CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.')
    }
  }

  private validarEmail(email: string | null | undefined, idExcluido?: number): void {
    if (email && this.clientes.emailEmUso(email, idExcluido)) {
      throw new ErroDeDominio('EMAIL_DUPLICADO', 'Já existe cliente com esse e-mail.')
    }
  }
}
