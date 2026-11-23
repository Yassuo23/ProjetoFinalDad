import { describe, expect, it, vi } from 'vitest'
import type { Categoria } from '../../shared/contratos/modelos'
import type { RepositorioCategorias } from '../repositorios/CategoriaRepositorio'
import { CategoriaServico } from './CategoriaServico'

const categorias: readonly Categoria[] = [
  { id: 1, nome: 'Trilha', descricao: null },
  { id: 2, nome: 'Camping', descricao: 'Barracas' },
]

describe('CategoriaServico', () => {
  it('ordena por nome em pt-BR', () => {
    const repositorio: RepositorioCategorias = { listar: () => [...categorias] }
    const servico = new CategoriaServico(repositorio)

    expect(servico.listar().map((categoria) => categoria.nome)).toEqual(['Camping', 'Trilha'])
  })

  it('não devolve a referência interna do repositório', () => {
    const repositorio: RepositorioCategorias = { listar: vi.fn(() => [...categorias]) }
    const servico = new CategoriaServico(repositorio)

    const lista = servico.listar()
    lista.reverse()

    expect(servico.listar().map((categoria) => categoria.nome)).toEqual(['Camping', 'Trilha'])
  })
})
