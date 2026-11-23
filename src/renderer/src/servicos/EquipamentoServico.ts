import type { Categoria, Equipamento } from '../../../shared/contratos/modelos'

export interface ResultadoEquipamentos {
  readonly itens: readonly Equipamento[]
  readonly dadosDeExemplo: boolean
}

export interface ResultadoCategorias {
  readonly itens: readonly Categoria[]
  readonly dadosDeExemplo: boolean
}

/**
 * Fallback tipado enquanto os handlers de equipamentos/categorias não são
 * registrados no main. Nenhum dado de exemplo vaza para os contratos.
 */
const CATEGORIAS_EXEMPLO: readonly Categoria[] = [
  { id: 1, nome: 'Camping', descricao: 'Barracas, sacos e fogareiros' },
  { id: 2, nome: 'Ciclismo', descricao: 'Bicicletas e acessórios' },
  { id: 3, nome: 'Náutica', descricao: 'Caiaques e pranchas' },
  { id: 4, nome: 'Escalada', descricao: 'Cordas e equipamento de proteção' },
]

const EQUIPAMENTOS_EXEMPLO: readonly Equipamento[] = [
  { id: 101, nome: 'Bicicleta MTB Aro 29', categoriaId: 2, precoDiaria: 90, disponivel: true },
  { id: 102, nome: 'Bicicleta urbana', categoriaId: 2, precoDiaria: 60, disponivel: false },
  { id: 103, nome: 'Caiaque 2 lugares', categoriaId: 3, precoDiaria: 140, disponivel: true },
  { id: 104, nome: 'Prancha de stand up', categoriaId: 3, precoDiaria: 120, disponivel: true },
  { id: 105, nome: 'Barraca 4 pessoas', categoriaId: 1, precoDiaria: 75, disponivel: false },
  { id: 106, nome: 'Fogareiro a gás', categoriaId: 1, precoDiaria: 25, disponivel: true },
  { id: 107, nome: 'Kit de escalada', categoriaId: 4, precoDiaria: 110, disponivel: true },
]

export class EquipamentoServico {
  async listar(): Promise<ResultadoEquipamentos> {
    try {
      const itens = await window.electronAPI.equipamentos.listar()
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
}
