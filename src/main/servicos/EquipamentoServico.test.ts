import { describe, expect, it, vi } from 'vitest'
import type {
  CodigoErroDominio,
  Equipamento,
  EquipamentoDisponiveisEntrada,
} from '../../shared/contratos/modelos'
import type { RepositorioCategorias } from '../repositorios/CategoriaRepositorio'
import type { RepositorioEquipamentos } from '../repositorios/EquipamentoRepositorio'
import type { ServicoDisponibilidade } from './DisponibilidadeServico'
import { ErroDeDominio } from './ErroDominio'
import { EquipamentoServico } from './EquipamentoServico'

const PERIODO = {
  inicio: '2026-12-01T00:00:00.000Z',
  fim: '2026-12-05T00:00:00.000Z',
}

class RepositorioEquipamentosFalso implements RepositorioEquipamentos {
  private readonly itens: Equipamento[]

  constructor(itens: Equipamento[] = []) {
    this.itens = [...itens]
  }

  listar(): Equipamento[] {
    return [...this.itens]
  }

  buscarPorId(id: number): Equipamento | null {
    return this.itens.find((item) => item.id === id) ?? null
  }

  criar(dados: {
    nome: string
    categoriaId: number
    precoDiaria: number
    valorAquisicao: number
    descricao?: string | null
  }): Equipamento {
    const criado: Equipamento = {
      id: this.itens.length + 1,
      nome: dados.nome,
      categoriaId: dados.categoriaId,
      precoDiaria: dados.precoDiaria,
      valorAquisicao: dados.valorAquisicao,
      estado: 'disponivel',
      ativo: true,
      descricao: dados.descricao ?? null,
    }
    this.itens.push(criado)
    return criado
  }

  atualizar(dados: {
    id: number
    nome?: string
    categoriaId?: number
    precoDiaria?: number
    valorAquisicao?: number
    estado?: Equipamento['estado']
    descricao?: string | null
  }): Equipamento | null {
    const item = this.buscarPorId(dados.id)
    if (!item) return null
    item.nome = dados.nome ?? item.nome
    item.categoriaId = dados.categoriaId ?? item.categoriaId
    item.precoDiaria = dados.precoDiaria ?? item.precoDiaria
    item.valorAquisicao = dados.valorAquisicao ?? item.valorAquisicao
    item.estado = dados.estado ?? item.estado
    if (dados.descricao !== undefined) item.descricao = dados.descricao
    return item
  }

  inativar(id: number): boolean {
    const item = this.buscarPorId(id)
    if (!item) return false
    item.ativo = false
    return true
  }

  listarDisponiveis(): Equipamento[] {
    return this.itens.filter((item) => item.ativo && item.estado === 'disponivel')
  }

  nomeEmUso(nome: string, idExcluido?: number): boolean {
    return this.itens.some(
      (item) => item.nome.toLowerCase() === nome.toLowerCase() && item.id !== idExcluido,
    )
  }
}

const categorias: RepositorioCategorias = {
  listar: () => [{ id: 1, nome: 'Camping', descricao: null }],
}

const disponibilidadeSemSobreposicao: ServicoDisponibilidade = {
  verificar: () => ({ disponivel: true }),
  filtrar: (equipamentos) => [...equipamentos],
}

const dadosNovos = {
  nome: 'Tenda',
  categoriaId: 1,
  precoDiaria: 80,
  valorAquisicao: 900,
}

function codigoDoErro(acao: () => unknown): CodigoErroDominio {
  try {
    acao()
  } catch (erro) {
    if (erro instanceof ErroDeDominio) {
      expect(erro.message).toBe(erro.codigo)
      return erro.codigo
    }
    throw erro
  }
  throw new Error('Era esperado um erro de domínio')
}

describe('EquipamentoServico', () => {
  it('cria com categoria válida e nome livre', () => {
    const servico = new EquipamentoServico(
      new RepositorioEquipamentosFalso(),
      categorias,
      disponibilidadeSemSobreposicao,
    )

    expect(servico.criar(dadosNovos)).toMatchObject({ nome: 'Tenda', estado: 'disponivel' })
  })

  it('rejeita nome duplicado e categoria inexistente', () => {
    const repositorio = new RepositorioEquipamentosFalso()
    repositorio.criar(dadosNovos)
    const servico = new EquipamentoServico(
      repositorio,
      categorias,
      disponibilidadeSemSobreposicao,
    )

    expect(codigoDoErro(() => servico.criar({ ...dadosNovos, nome: 'tenda' }))).toBe(
      'NOME_DUPLICADO',
    )
    expect(
      codigoDoErro(() => servico.criar({ ...dadosNovos, nome: 'Mochila', categoriaId: 99 })),
    ).toBe('CATEGORIA_NAO_ENCONTRADA')
  })

  it('rejeita busca, atualização e inativação de inexistente', () => {
    const servico = new EquipamentoServico(
      new RepositorioEquipamentosFalso(),
      categorias,
      disponibilidadeSemSobreposicao,
    )

    expect(codigoDoErro(() => servico.buscarPorId(42))).toBe('EQUIPAMENTO_NAO_ENCONTRADO')
    expect(codigoDoErro(() => servico.atualizar({ id: 42, nome: 'X' }))).toBe(
      'EQUIPAMENTO_NAO_ENCONTRADO',
    )
    expect(codigoDoErro(() => servico.inativar(42))).toBe('EQUIPAMENTO_NAO_ENCONTRADO')
  })

  it('rejeita período invertido e delega a listagem de disponíveis', () => {
    const repositorio = new RepositorioEquipamentosFalso()
    repositorio.criar(dadosNovos)
    const servico = new EquipamentoServico(
      repositorio,
      categorias,
      disponibilidadeSemSobreposicao,
    )

    expect(servico.listarDisponiveis(PERIODO)).toHaveLength(1)
    expect(codigoDoErro(() => servico.listarDisponiveis({ inicio: PERIODO.fim, fim: PERIODO.inicio }))).toBe(
      'PERIODO_INVALIDO',
    )
  })

  it('delega o filtro de disponibilidade ao serviço injetado', () => {
    const repositorio = new RepositorioEquipamentosFalso()
    repositorio.criar(dadosNovos)
    const filtrar = vi.fn(
      (itens: readonly Equipamento[], _periodo: EquipamentoDisponiveisEntrada) => [...itens],
    )
    const servico = new EquipamentoServico(repositorio, categorias, { filtrar })

    const disponiveis = servico.listarDisponiveis(PERIODO)

    expect(disponiveis).toHaveLength(1)
    expect(filtrar).toHaveBeenCalledWith(disponiveis, PERIODO)
  })
})
