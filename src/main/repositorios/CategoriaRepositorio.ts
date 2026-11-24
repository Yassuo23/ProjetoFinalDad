import type { DatabaseSync } from 'node:sqlite'
import type { Categoria } from '../../shared/contratos/modelos'

/** Porta do repositório usada pelo serviço — permite substituir o banco nos testes. */
export interface RepositorioCategorias {
  listar(): Categoria[]
}

/** Acesso a dados de categorias. Sem regra de negócio e sem SQL concatenado. */
export class CategoriaRepositorio implements RepositorioCategorias {
  constructor(private readonly db: DatabaseSync) {}

  listar(): Categoria[] {
    const linhas = this.db.prepare('SELECT id, nome, descricao FROM categorias').all()
    return linhas.map((linha) => paraCategoria(linha))
  }
}

function paraCategoria(linha: Record<string, unknown>): Categoria {
  const { id, nome, descricao } = linha

  const idValido = typeof id === 'number' || typeof id === 'bigint'
  if (!idValido || typeof nome !== 'string') {
    throw new Error('CATEGORIA_LINHA_INVALIDA')
  }
  if (descricao !== null && typeof descricao !== 'string') {
    throw new Error('CATEGORIA_LINHA_INVALIDA')
  }

  return { id: Number(id), nome, descricao }
}
