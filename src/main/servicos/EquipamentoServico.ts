import type {
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  PeriodoEntrada,
} from '../../shared/contratos/modelos'
import type {
  RepositorioEquipamentos,
  RepositorioFornecedores,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoDisponibilidade, ServicoEquipamentos } from './portas'

type Colaborador = RepositorioFornecedores | ServicoDisponibilidade

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Equipamento não encontrado.')

function ehDisponibilidade(colaborador: Colaborador): colaborador is ServicoDisponibilidade {
  return typeof colaborador === 'object' && colaborador !== null && 'validarItens' in colaborador
}

function obrigatorio<T>(valor: T | undefined, nome: string): T {
  if (valor === undefined) throw new Error(`Dependência obrigatória não informada: ${nome}`)
  return valor
}

export class EquipamentoServico implements ServicoEquipamentos {
  private readonly repositorioFornecedores: RepositorioFornecedores
  private readonly servicoDisponibilidade: ServicoDisponibilidade

  constructor(
    private readonly repositorio: RepositorioEquipamentos,
    fornecedoresOuDisponibilidade: Colaborador,
    disponibilidadeOuFornecedores: Colaborador,
  ) {
    if (ehDisponibilidade(fornecedoresOuDisponibilidade)) {
      this.servicoDisponibilidade = fornecedoresOuDisponibilidade
      this.repositorioFornecedores = obrigatorio(
        disponibilidadeOuFornecedores as RepositorioFornecedores | undefined,
        'repositório de fornecedores',
      )
    } else {
      this.repositorioFornecedores = fornecedoresOuDisponibilidade
      this.servicoDisponibilidade = obrigatorio(
        disponibilidadeOuFornecedores as ServicoDisponibilidade | undefined,
        'serviço de disponibilidade',
      )
    }
  }

  listar(filtros?: EquipamentoListarFiltros): Promise<readonly Equipamento[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  listarDisponiveis(periodo: PeriodoEntrada): Promise<readonly Equipamento[]> {
    return this.servicoDisponibilidade.listarDisponiveis(periodo)
  }

  async buscarPorId(id: number): Promise<Equipamento> {
    const equipamento = await this.repositorio.buscarPorId(id)
    if (!equipamento) throw NAO_ENCONTRADO()
    return equipamento
  }

  async criar(dados: EquipamentoCriarEntrada): Promise<Equipamento> {
    if (await this.nomeEmUso(dados.nome)) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'Já existe um equipamento com este nome.')
    }
    if (dados.fornecedorId !== undefined && dados.fornecedorId !== null) {
      await this.validarFornecedor(dados.fornecedorId)
    }

    const envio: EquipamentoCriarEntrada = {
      nome: dados.nome,
      categoria: dados.categoria,
      estadoConservacao: dados.estadoConservacao,
      disponibilidade: dados.disponibilidade ?? 'Disponível',
      ...(dados.fornecedorId !== undefined ? { fornecedorId: dados.fornecedorId } : {}),
    }

    try {
      return await this.repositorio.criar(envio)
    } catch (erro) {
      throw paraErroDominio(erro, 'equipamento')
    }
  }

  async atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento> {
    await this.buscarPorId(dados.id)

    if (dados.nome !== undefined && (await this.nomeEmUso(dados.nome, dados.id))) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'Já existe um equipamento com este nome.')
    }
    if (dados.fornecedorId !== undefined && dados.fornecedorId !== null) {
      await this.validarFornecedor(dados.fornecedorId)
    }

    const envio: EquipamentoAtualizarEntrada = {
      id: dados.id,
      ...(dados.nome !== undefined ? { nome: dados.nome } : {}),
      ...(dados.categoria !== undefined ? { categoria: dados.categoria } : {}),
      ...(dados.estadoConservacao !== undefined
        ? { estadoConservacao: dados.estadoConservacao }
        : {}),
      ...(dados.disponibilidade !== undefined
        ? { disponibilidade: dados.disponibilidade }
        : {}),
      ...(dados.fornecedorId !== undefined ? { fornecedorId: dados.fornecedorId } : {}),
    }

    try {
      const atualizado = await this.repositorio.atualizar(envio)
      if (!atualizado) throw NAO_ENCONTRADO()
      return atualizado
    } catch (erro) {
      throw paraErroDominio(erro, 'equipamento')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)

    let inativado: boolean
    try {
      inativado = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'equipamento')
    }
    if (!inativado) throw NAO_ENCONTRADO()
  }

  private async nomeEmUso(nome: string, idExcluido?: number): Promise<boolean> {
    try {
      return idExcluido === undefined
        ? await this.repositorio.nomeEmUso(nome)
        : await this.repositorio.nomeEmUso(nome, idExcluido)
    } catch (erro) {
      throw paraErroDominio(erro, 'equipamento')
    }
  }

  private async validarFornecedor(id: number): Promise<void> {
    let fornecedor: unknown
    try {
      fornecedor = await this.repositorioFornecedores.buscarPorId(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'fornecedor')
    }
    if (!fornecedor) {
      throw new ErroDeDominio('RELACAO_INVALIDA', 'Fornecedor não encontrado.')
    }
  }
}
