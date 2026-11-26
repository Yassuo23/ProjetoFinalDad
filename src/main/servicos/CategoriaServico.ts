import type {
  Categoria,
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaDetalhe,
  CategoriaListarFiltros,
} from '../../shared/contratos/modelos'
import type { RepositorioCategorias } from '../repositorios/portas'
import { ErroDeDominio } from './ErroDeDominio'
import type { ServicoCategorias } from './portas'

const colatorPtBr = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/** Texto exigido pela regra de negócio — enviado ao renderer sem detalhes de SQL. */
export const MENSAGEM_CATEGORIA_EM_USO =
  'Não é possível inativar esta categoria: há equipamentos cadastrados nela.'

/**
 * Categorias: ordenação pt-BR, unicidade de nome e soft delete.
 *
 * NOTA DE CONTRATO: `CATEGORIA_EM_USO` ainda não existe em `CodigoErroDominio`
 * (`src/shared/contratos/modelos.ts`). Como contratos compartilhados não podem
 * ser alterados nesta entrega, usa-se `RELACAO_INVALIDA` (código estável já
 * previsto) com a mensagem exata acima. Nunca há exclusão física.
 */
export class CategoriaServico implements ServicoCategorias {
  constructor(private readonly repositorio: RepositorioCategorias) {}

  async listar(filtros?: CategoriaListarFiltros): Promise<readonly Categoria[]> {
    const categorias = await this.repositorio.listar(filtros)
    return [...categorias].sort(
      (a, b) => colatorPtBr.compare(a.nome, b.nome) || a.id - b.id,
    )
  }

  async buscarPorId(id: number): Promise<CategoriaDetalhe> {
    const categoria = await this.repositorio.buscarPorId(id)
    if (!categoria) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Categoria não encontrada.')
    }
    return categoria
  }

  async criar(dados: CategoriaCriarEntrada): Promise<CategoriaDetalhe> {
    if (await this.repositorio.nomeEmUso(dados.nome)) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'Categoria já está cadastrada.')
    }
    return this.repositorio.criar(dados)
  }

  async atualizar(dados: CategoriaAtualizarEntrada): Promise<CategoriaDetalhe> {
    if (dados.nome !== undefined && (await this.repositorio.nomeEmUso(dados.nome, dados.id))) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'Categoria já está cadastrada.')
    }
    const atualizada = await this.repositorio.atualizar(dados)
    if (!atualizada) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Categoria não encontrada.')
    }
    return atualizada
  }

  async inativar(id: number): Promise<void> {
    const categoria = await this.repositorio.buscarPorId(id)
    if (!categoria) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Categoria não encontrada.')
    }
    if (await this.repositorio.emUsoPorEquipamento(categoria.nome)) {
      throw new ErroDeDominio('RELACAO_INVALIDA', MENSAGEM_CATEGORIA_EM_USO)
    }
    if (!(await this.repositorio.inativar(id))) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Categoria não encontrada.')
    }
  }
}
