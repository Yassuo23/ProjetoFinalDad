import type {
  Categoria,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  PeriodoEntrada,
} from '../../../shared/contratos/modelos'

export interface ResultadoEquipamentos {
  readonly itens: readonly Equipamento[]
  readonly dadosDeExemplo: boolean
}

export interface ResultadoCategorias {
  readonly itens: readonly Categoria[]
  readonly dadosDeExemplo: boolean
}

/**
 * Fallback tipado enquanto o banco não estiver disponível. Nenhum dado de
 * exemplo vaza para os contratos nem é confundido com dado persistido.
 */
const CATEGORIAS_EXEMPLO: readonly Categoria[] = [
  { id: 1, nome: 'Bicicleta', descricao: 'Bicicletas e acessórios' },
  { id: 2, nome: 'Caiaque', descricao: 'Caiaques e remos' },
  { id: 3, nome: 'Prancha', descricao: 'Pranchas e stand up paddle' },
  { id: 4, nome: 'Camping', descricao: 'Barracas e itens de acampamento' },
]

const ATUALIZADO_EXEMPLO = '2026-01-01T00:00:00.000Z'

const EQUIPAMENTOS_EXEMPLO: readonly Equipamento[] = [
  {
    id: 101,
    nome: 'Bicicleta MTB Aro 29',
    categoria: 'Bicicleta',
    estadoConservacao: 'Bom',
    disponibilidade: 'Disponível',
    fornecedorId: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 102,
    nome: 'Bicicleta urbana',
    categoria: 'Bicicleta',
    estadoConservacao: 'Em Manutenção',
    disponibilidade: 'Em manutenção',
    fornecedorId: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 103,
    nome: 'Caiaque 2 lugares',
    categoria: 'Caiaque',
    estadoConservacao: 'Bom',
    disponibilidade: 'Disponível',
    fornecedorId: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 104,
    nome: 'Prancha de stand up',
    categoria: 'Prancha',
    estadoConservacao: 'Novo',
    disponibilidade: 'Disponível',
    fornecedorId: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
  {
    id: 105,
    nome: 'Barraca 4 pessoas',
    categoria: 'Camping',
    estadoConservacao: 'Desgastado',
    disponibilidade: 'Disponível',
    fornecedorId: null,
    ativo: true,
    atualizadoEm: ATUALIZADO_EXEMPLO,
  },
]

export class EquipamentoServico {
  async listar(filtros: EquipamentoListarFiltros = {}): Promise<ResultadoEquipamentos> {
    try {
      const itens = await window.electronAPI.equipamentos.listar(filtros)
      return { itens, dadosDeExemplo: false }
    } catch {
      return { itens: EQUIPAMENTOS_EXEMPLO, dadosDeExemplo: true }
    }
  }

  async listarCategorias(): Promise<ResultadoCategorias> {
    try {
      const itens = await window.electronAPI.categorias.listar()
      return { itens, dadosDeExemplo: false }
    } catch {
      return { itens: CATEGORIAS_EXEMPLO, dadosDeExemplo: true }
    }
  }

  /** Disponibilidade real por período: nunca usa dados de exemplo. */
  listarDisponiveis(periodo: PeriodoEntrada): Promise<Equipamento[]> {
    return window.electronAPI.equipamentos.listarDisponiveis(periodo)
  }

  buscarPorId(id: number): Promise<Equipamento> {
    return window.electronAPI.equipamentos.buscarPorId(id)
  }

  criar(dados: EquipamentoCriarEntrada): Promise<Equipamento> {
    return window.electronAPI.equipamentos.criar(dados)
  }

  atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento> {
    return window.electronAPI.equipamentos.atualizar(dados)
  }

  inativar(id: number): Promise<void> {
    return window.electronAPI.equipamentos.inativar(id)
  }
}
