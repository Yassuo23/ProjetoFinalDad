import type {
  EstadoConservacao,
  OrdemManutencao,
  OrdemManutencaoAtualizarEntrada,
  OrdemManutencaoConcluirEntrada,
  OrdemManutencaoCriarEntrada,
  OrdemManutencaoListarFiltros,
} from '../../shared/contratos/modelos'
import type {
  RepositorioEquipamentos,
  RepositorioFornecedores,
  RepositorioManutencoes,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoManutencao } from './portas'

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Ordem de manutenção não encontrada.')

/**
 * Conservação assumida depois de uma revisão bem-sucedida. O contrato de
 * `concluir` não traz um novo estado (ADR 0007), então a regra é fixa no main:
 * o equipamento volta como `Bom` e `Disponível` na mesma transação da ordem.
 */
const ESTADO_POS_MANUTENCAO: EstadoConservacao = 'Bom'

const ENVIAR_EFEITOS = {
  estadoConservacao: 'Em Manutenção',
  disponibilidade: 'Em manutenção',
} as const

const RETORNAR_EFEITOS = {
  estadoConservacao: ESTADO_POS_MANUTENCAO,
  disponibilidade: 'Disponível',
} as const

function hoje(): string {
  return new Date().toISOString().slice(0, 10)
}

export class ManutencaoServico implements ServicoManutencao {
  constructor(
    private readonly repositorio: RepositorioManutencoes,
    private readonly repositorioEquipamentos: RepositorioEquipamentos,
    private readonly repositorioFornecedores: RepositorioFornecedores,
  ) {}

  listar(filtros?: OrdemManutencaoListarFiltros): Promise<readonly OrdemManutencao[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<OrdemManutencao> {
    const ordem = await this.repositorio.buscarPorId(id)
    if (!ordem) throw NAO_ENCONTRADO()
    return ordem
  }

  async criar(dados: OrdemManutencaoCriarEntrada): Promise<OrdemManutencao> {
    await this.validarEquipamento(dados.equipamentoId)
    if (dados.fornecedorId !== undefined && dados.fornecedorId !== null) {
      await this.validarFornecedor(dados.fornecedorId)
    }
    this.validarPeriodo(dados.dataEnvio, dados.dataRetornoPrevista)

    try {
      return await this.repositorio.criarComEfeitos(dados, ENVIAR_EFEITOS)
    } catch (erro) {
      throw paraErroDominio(erro, 'ordem de manutenção')
    }
  }

  async atualizar(dados: OrdemManutencaoAtualizarEntrada): Promise<OrdemManutencao> {
    const atual = await this.buscarPorId(dados.id)

    if (dados.equipamentoId !== undefined && dados.equipamentoId !== atual.equipamentoId) {
      await this.validarEquipamento(dados.equipamentoId)
    }
    const fornecedorId =
      dados.fornecedorId === undefined ? atual.fornecedorId : dados.fornecedorId
    if (fornecedorId !== null) await this.validarFornecedor(fornecedorId)

    this.validarPeriodo(
      dados.dataEnvio ?? atual.dataEnvio,
      dados.dataRetornoPrevista === undefined
        ? atual.dataRetornoPrevista
        : dados.dataRetornoPrevista,
    )

    // `concluir` é a ação explícita que aplica os efeitos no equipamento.
    if (dados.status === 'Concluída') {
      return this.concluir({
        id: dados.id,
        ...(typeof dados.dataRetorno === 'string' ? { dataRetorno: dados.dataRetorno } : {}),
        ...(dados.custo !== undefined ? { custo: dados.custo } : {}),
      })
    }

    try {
      const atualizada = await this.repositorio.atualizar(dados)
      if (!atualizada) throw NAO_ENCONTRADO()
      return atualizada
    } catch (erro) {
      throw paraErroDominio(erro, 'ordem de manutenção')
    }
  }

  async concluir(dados: OrdemManutencaoConcluirEntrada): Promise<OrdemManutencao> {
    const atual = await this.buscarPorId(dados.id)
    if (atual.status === 'Concluída') {
      throw new ErroDeDominio('DADOS_INVALIDOS', 'Esta ordem de manutenção já foi concluída.')
    }

    const dataRetorno = dados.dataRetorno ?? hoje()
    if (dataRetorno < atual.dataEnvio) {
      throw new ErroDeDominio(
        'PERIODO_INVALIDO',
        'A data de retorno não pode ser anterior ao envio.',
      )
    }

    try {
      const concluida = await this.repositorio.concluirComEfeitos(
        { id: dados.id, dataRetorno, custo: dados.custo },
        RETORNAR_EFEITOS,
      )
      if (!concluida) throw NAO_ENCONTRADO()
      return concluida
    } catch (erro) {
      throw paraErroDominio(erro, 'ordem de manutenção')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)
    let inativada: boolean
    try {
      inativada = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'ordem de manutenção')
    }
    if (!inativada) throw NAO_ENCONTRADO()
  }

  private validarPeriodo(
    dataEnvio: string,
    dataRetornoPrevista: string | null | undefined,
  ): void {
    if (dataRetornoPrevista != null && dataRetornoPrevista < dataEnvio) {
      throw new ErroDeDominio(
        'PERIODO_INVALIDO',
        'A data de retorno prevista não pode ser anterior ao envio.',
      )
    }
  }

  private async validarEquipamento(id: number): Promise<void> {
    try {
      const equipamento = await this.repositorioEquipamentos.buscarPorId(id)
      if (!equipamento) {
        throw new ErroDeDominio('RELACAO_INVALIDA', 'Equipamento não encontrado.')
      }
    } catch (erro) {
      throw paraErroDominio(erro, 'equipamento')
    }
  }

  private async validarFornecedor(id: number): Promise<void> {
    try {
      const fornecedor = await this.repositorioFornecedores.buscarPorId(id)
      if (!fornecedor) {
        throw new ErroDeDominio('RELACAO_INVALIDA', 'Fornecedor não encontrado.')
      }
    } catch (erro) {
      throw paraErroDominio(erro, 'fornecedor')
    }
  }
}
