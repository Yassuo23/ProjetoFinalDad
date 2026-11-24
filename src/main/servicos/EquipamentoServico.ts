import type {
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoDisponiveisEntrada,
  EquipamentoListarFiltros,
} from '../../shared/contratos/modelos'
import type {
  RepositorioCategorias,
} from '../repositorios/CategoriaRepositorio'
import type {
  RepositorioEquipamentos,
} from '../repositorios/EquipamentoRepositorio'
import type { ServicoDisponibilidade } from './DisponibilidadeServico'
import { ErroDeDominio } from './ErroDominio'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoEquipamentos {
  listar(filtros?: EquipamentoListarFiltros): Equipamento[]
  buscarPorId(id: number): Equipamento
  criar(dados: EquipamentoCriarEntrada): Equipamento
  atualizar(dados: EquipamentoAtualizarEntrada): Equipamento
  inativar(id: number): void
  listarDisponiveis(periodo: EquipamentoDisponiveisEntrada): Equipamento[]
}

/** Filtro mínimo necessário para listar equipamentos disponíveis. */
type FiltroDisponibilidade = Pick<ServicoDisponibilidade, 'filtrar'>

/** Mantém o comportamento P1 até a composição de handlers injetar o serviço real. */
const filtroSemReservas: FiltroDisponibilidade = {
  filtrar: (equipamentos) => [...equipamentos],
}

/** Regras de negócio do equipamento. Não conhece IPC, janela nem SQL. */
export class EquipamentoServico implements ServicoEquipamentos {
  constructor(
    private readonly equipamentos: RepositorioEquipamentos,
    private readonly categorias: RepositorioCategorias,
    private readonly disponibilidade: FiltroDisponibilidade = filtroSemReservas,
  ) {}

  listar(filtros?: EquipamentoListarFiltros): Equipamento[] {
    return this.equipamentos.listar(filtros)
  }

  buscarPorId(id: number): Equipamento {
    const equipamento = this.equipamentos.buscarPorId(id)
    if (!equipamento) {
      throw new ErroDeDominio('EQUIPAMENTO_NAO_ENCONTRADO', 'Equipamento não encontrado.')
    }
    return equipamento
  }

  criar(dados: EquipamentoCriarEntrada): Equipamento {
    if (this.equipamentos.nomeEmUso(dados.nome)) {
      throw new ErroDeDominio('NOME_DUPLICADO', 'Já existe equipamento com esse nome.')
    }
    this.validarCategoria(dados.categoriaId)
    return this.equipamentos.criar(dados)
  }

  atualizar(dados: EquipamentoAtualizarEntrada): Equipamento {
    this.buscarPorId(dados.id)

    if (dados.nome !== undefined && this.equipamentos.nomeEmUso(dados.nome, dados.id)) {
      throw new ErroDeDominio('NOME_DUPLICADO', 'Já existe equipamento com esse nome.')
    }
    if (dados.categoriaId !== undefined) {
      this.validarCategoria(dados.categoriaId)
    }

    const atualizado = this.equipamentos.atualizar(dados)
    if (!atualizado) {
      throw new ErroDeDominio('EQUIPAMENTO_NAO_ENCONTRADO', 'Equipamento não encontrado.')
    }
    return atualizado
  }

  inativar(id: number): void {
    if (!this.equipamentos.inativar(id)) {
      throw new ErroDeDominio('EQUIPAMENTO_NAO_ENCONTRADO', 'Equipamento não encontrado.')
    }
  }

  listarDisponiveis(periodo: EquipamentoDisponiveisEntrada): Equipamento[] {
    if (periodo.inicio >= periodo.fim) {
      throw new ErroDeDominio('PERIODO_INVALIDO', 'O início deve ser anterior ao fim.')
    }
    return this.disponibilidade.filtrar(this.equipamentos.listarDisponiveis(periodo), periodo)
  }

  private validarCategoria(categoriaId: number): void {
    const existe = this.categorias.listar().some((categoria) => categoria.id === categoriaId)
    if (!existe) {
      throw new ErroDeDominio('CATEGORIA_NAO_ENCONTRADA', 'Categoria não encontrada.')
    }
  }
}
