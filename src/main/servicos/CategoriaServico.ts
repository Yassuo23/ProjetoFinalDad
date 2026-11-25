import type { Categoria } from '../../shared/contratos/modelos'
import type { RepositorioCategorias } from '../repositorios/portas'
import type { ServicoCategorias } from './portas'

const colatorPtBr = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/** Categorias são somente leitura: a regra aqui é apenas a ordenação pt-BR. */
export class CategoriaServico implements ServicoCategorias {
  constructor(private readonly repositorio: RepositorioCategorias) {}

  async listar(): Promise<readonly Categoria[]> {
    const categorias = await this.repositorio.listar()
    return [...categorias].sort(
      (a, b) => colatorPtBr.compare(a.nome, b.nome) || a.id - b.id,
    )
  }
}
