import { describe, expect, it, vi } from 'vitest'
import type {
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaDetalhe,
  CategoriaListarFiltros,
} from '../../shared/contratos/modelos'
import type { RepositorioCategorias } from '../repositorios/portas'
import { CategoriaServico, MENSAGEM_CATEGORIA_EM_USO } from './CategoriaServico'
import { ErroDeDominio } from './ErroDeDominio'

const AUDITORIA = '2026-11-25T12:00:00.000Z'

function categoria(id: number, nome: string, ativo = true): CategoriaDetalhe {
  return { id, nome, descricao: null, ativo, atualizadoEm: AUDITORIA }
}

class RepositorioCategoriasFalso implements RepositorioCategorias {
  readonly inativadas: number[] = []
  emUso = false

  constructor(private readonly categorias: CategoriaDetalhe[]) {}

  async listar(_filtros?: CategoriaListarFiltros): Promise<readonly CategoriaDetalhe[]> {
    return [...this.categorias]
  }

  async buscarPorId(id: number): Promise<CategoriaDetalhe | null> {
    return this.categorias.find((item) => item.id === id) ?? null
  }

  async criar(dados: CategoriaCriarEntrada): Promise<CategoriaDetalhe> {
    return categoria(this.categorias.length + 1, dados.nome)
  }

  async atualizar(dados: CategoriaAtualizarEntrada): Promise<CategoriaDetalhe | null> {
    const atual = await this.buscarPorId(dados.id)
    if (!atual) return null
    return { ...atual, ...(dados.nome === undefined ? {} : { nome: dados.nome }) }
  }

  async inativar(id: number): Promise<boolean> {
    this.inativadas.push(id)
    return true
  }

  async nomeEmUso(nome: string, idExcluido?: number): Promise<boolean> {
    return this.categorias.some(
      (item) => item.nome === nome && item.id !== (idExcluido ?? -1),
    )
  }

  async emUsoPorEquipamento(_nome: string): Promise<boolean> {
    return this.emUso
  }
}

function servico(): { servico: CategoriaServico; repositorio: RepositorioCategoriasFalso } {
  const repositorio = new RepositorioCategoriasFalso([
    categoria(1, 'Camping'),
    categoria(2, 'Bicicleta'),
  ])
  return { servico: new CategoriaServico(repositorio), repositorio }
}

describe('CategoriaServico — CRUD completo', () => {
  it('ordena a listagem em pt-BR', async () => {
    const { servico: categorias } = servico()

    await expect(categorias.listar()).resolves.toMatchObject([{ nome: 'Bicicleta' }, { nome: 'Camping' }])
  })

  it('busca por id e reclama registro inexistente', async () => {
    const { servico: categorias } = servico()

    await expect(categorias.buscarPorId(1)).resolves.toMatchObject({ nome: 'Camping' })
    await expect(categorias.buscarPorId(99)).rejects.toMatchObject({ codigo: 'NAO_ENCONTRADO' })
  })

  it('impede nome duplicado na criação e na atualização', async () => {
    const { servico: categorias } = servico()

    await expect(categorias.criar({ nome: 'Camping' })).rejects.toMatchObject({
      codigo: 'REGISTRO_DUPLICADO',
    })
    await expect(categorias.atualizar({ id: 2, nome: 'Camping' })).rejects.toMatchObject({
      codigo: 'REGISTRO_DUPLICADO',
    })
  })

  it('bloqueia inativação com a mensagem exata quando há equipamentos', async () => {
    const { servico: categorias, repositorio } = servico()
    repositorio.emUso = true
    const espiao = vi.spyOn(repositorio, 'inativar')

    await expect(categorias.inativar(1)).rejects.toEqual(
      new ErroDeDominio('RELACAO_INVALIDA', MENSAGEM_CATEGORIA_EM_USO),
    )
    expect(espiao).not.toHaveBeenCalled()
  })

  it('inativa quando a categoria não está em uso', async () => {
    const { servico: categorias, repositorio } = servico()

    await categorias.inativar(2)
    expect(repositorio.inativadas).toEqual([2])
  })

  it('não inativa categoria inexistente', async () => {
    const { servico: categorias, repositorio } = servico()

    await expect(categorias.inativar(99)).rejects.toMatchObject({ codigo: 'NAO_ENCONTRADO' })
    expect(repositorio.inativadas).toEqual([])
  })
})
