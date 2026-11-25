import type {
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
} from '../../shared/contratos/modelos'
import type { RepositorioFornecedores } from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoFornecedores } from './portas'

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Fornecedor não encontrado.')

export class FornecedorServico implements ServicoFornecedores {
  constructor(private readonly repositorio: RepositorioFornecedores) {}

  listar(filtros?: FornecedorListarFiltros): Promise<readonly Fornecedor[]> {
    return filtros === undefined
      ? this.repositorio.listar()
      : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<Fornecedor> {
    const fornecedor = await this.repositorio.buscarPorId(id)
    if (!fornecedor) throw NAO_ENCONTRADO()
    return fornecedor
  }

  async criar(dados: FornecedorCriarEntrada): Promise<Fornecedor> {
    // O repositório grava e compara o CNPJ exatamente como recebido.
    if (await this.cnpjEmUso(dados.cnpj)) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'CNPJ já cadastrado.')
    }

    const envio: FornecedorCriarEntrada = {
      nome: dados.nome,
      cnpj: dados.cnpj,
      ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
      ...(dados.email !== undefined ? { email: dados.email } : {}),
      ...(dados.tipo !== undefined ? { tipo: dados.tipo } : {}),
    }

    try {
      return await this.repositorio.criar(envio)
    } catch (erro) {
      throw paraErroDominio(erro, 'fornecedor')
    }
  }

  async atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor> {
    await this.buscarPorId(dados.id)

    if (dados.cnpj !== undefined && (await this.cnpjEmUso(dados.cnpj, dados.id))) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'CNPJ já cadastrado.')
    }

    const envio: FornecedorAtualizarEntrada = {
      id: dados.id,
      ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
      ...(dados.cnpj !== undefined ? { cnpj: dados.cnpj } : {}),
      ...(dados.telefone !== undefined ? { telefone: dados.telefone } : {}),
      ...(dados.email !== undefined ? { email: dados.email } : {}),
      ...(dados.tipo !== undefined ? { tipo: dados.tipo } : {}),
    }

    try {
      const atualizado = await this.repositorio.atualizar(envio)
      if (!atualizado) throw NAO_ENCONTRADO()
      return atualizado
    } catch (erro) {
      throw paraErroDominio(erro, 'fornecedor')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)

    let inativado: boolean
    try {
      inativado = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'fornecedor')
    }
    if (!inativado) throw NAO_ENCONTRADO()
  }

  private async cnpjEmUso(cnpj: string, idExcluido?: number): Promise<boolean> {
    try {
      return idExcluido === undefined
        ? await this.repositorio.cnpjEmUso(cnpj)
        : await this.repositorio.cnpjEmUso(cnpj, idExcluido)
    } catch (erro) {
      throw paraErroDominio(erro, 'fornecedor')
    }
  }
}
