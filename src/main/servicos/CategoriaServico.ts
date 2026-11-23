import type { Categoria } from '../../shared/contratos/modelos'
import type { RepositorioCategorias } from '../repositorios/CategoriaRepositorio'

/** Porta do serviço usada pelo handler — permite testar o handler sem banco. */
export interface ServicoCategorias {
  listar(): Categoria[]
}

/** Regra de negócio das categorias: devolver a lista em ordem alfabética pt-BR. */
export class CategoriaServico implements ServicoCategorias {
  constructor(private readonly repositorio: RepositorioCategorias) {}

  listar(): Categoria[] {
    return [...this.repositorio.listar()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  }
}
