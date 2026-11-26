import type {
  OrdemManutencao,
  OrdemManutencaoAtualizarEntrada,
  OrdemManutencaoConcluirEntrada,
  OrdemManutencaoCriarEntrada,
  OrdemManutencaoListarFiltros,
  StatusOrdemManutencao,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import {
  booleano,
  dataApenas,
  dataApenasOpcional,
  dataHora,
  numero,
  numeroOpcional,
  texto,
  textoEnumerado,
} from './mapeamento'
import type { EfeitosManutencao, RepositorioManutencoes } from './portas'
import { RepositorioBase } from './RepositorioBase'

const STATUS: readonly StatusOrdemManutencao[] = ['Aberta', 'Em andamento', 'Concluída']
const CONTEXTO = 'ordem de manutenção'

const CONSULTAR = `
  SELECT id_ordem AS id, id_equipamento AS equipamentoId,
         id_fornecedor AS fornecedorId, descricao,
         data_envio AS dataEnvio, data_retorno_prevista AS dataRetornoPrevista,
         data_retorno AS dataRetorno, custo, status, ativo,
         atualizado_em AS atualizadoEm
  FROM ordem_manutencao
`

function mapearOrdem(linha: RegistroBanco): OrdemManutencao {
  return {
    id: numero(linha, 'id', 'MANUTENCAO'),
    equipamentoId: numero(linha, 'equipamentoId', 'MANUTENCAO'),
    fornecedorId: numeroOpcional(linha, 'fornecedorId', 'MANUTENCAO'),
    descricao: texto(linha, 'descricao', 'MANUTENCAO'),
    dataEnvio: dataApenas(linha, 'dataEnvio', 'MANUTENCAO'),
    dataRetornoPrevista: dataApenasOpcional(linha, 'dataRetornoPrevista', 'MANUTENCAO'),
    dataRetorno: dataApenasOpcional(linha, 'dataRetorno', 'MANUTENCAO'),
    custo: numeroOpcional(linha, 'custo', 'MANUTENCAO'),
    status: textoEnumerado(linha, 'status', 'MANUTENCAO', STATUS),
    ativo: booleano(linha, 'ativo', 'MANUTENCAO'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'MANUTENCAO'),
  }
}

export class ManutencaoRepositorio extends RepositorioBase implements RepositorioManutencoes {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: OrdemManutencaoListarFiltros = {}): Promise<readonly OrdemManutencao[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.equipamentoId !== undefined) {
      condicoes.push('id_equipamento = ?')
      valores.push(filtros.equipamentoId)
    }
    if (filtros.fornecedorId !== undefined) {
      condicoes.push('id_fornecedor = ?')
      valores.push(filtros.fornecedorId)
    }
    if (filtros.status !== undefined) {
      condicoes.push('status = ?')
      valores.push(filtros.status)
    }
    if (filtros.dataEnvio !== undefined) {
      condicoes.push('data_envio = ?')
      valores.push(filtros.dataEnvio)
    }
    if (filtros.dataRetornoPrevista !== undefined) {
      condicoes.push('data_retorno_prevista = ?')
      valores.push(filtros.dataRetornoPrevista)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY data_envio DESC, id_ordem DESC${paginacao}`,
        valores,
      )
      return linhas.map(mapearOrdem)
    })
  }

  async buscarPorId(id: number): Promise<OrdemManutencao | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  /** Abertura da ordem e envio do equipamento para manutenção são atômicos. */
  async criarComEfeitos(
    dados: OrdemManutencaoCriarEntrada,
    efeitos: EfeitosManutencao,
  ): Promise<OrdemManutencao> {
    return this.transacao(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO ordem_manutencao
             (id_equipamento, id_fornecedor, descricao, data_envio,
              data_retorno_prevista, custo, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            dados.equipamentoId,
            dados.fornecedorId ?? null,
            dados.descricao,
            dados.dataEnvio,
            dados.dataRetornoPrevista ?? null,
            dados.custo ?? null,
            dados.status ?? 'Aberta',
          ],
        )
        id = resultado.insertId
        await this.aplicarEfeitos(cliente, dados.equipamentoId, efeitos)
      } catch (erro) {
        throw paraErroDominio(erro, CONTEXTO)
      }

      const criada = await this.lerPorId(cliente, id)
      if (!criada) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Ordem de manutenção não encontrada após a criação.')
      }
      return criada
    })
  }

  async atualizar(dados: OrdemManutencaoAtualizarEntrada): Promise<OrdemManutencao | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.equipamentoId !== undefined) {
      campos.push('id_equipamento = ?')
      valores.push(dados.equipamentoId)
    }
    if (dados.fornecedorId !== undefined) {
      campos.push('id_fornecedor = ?')
      valores.push(dados.fornecedorId)
    }
    if (dados.descricao !== undefined) {
      campos.push('descricao = ?')
      valores.push(dados.descricao)
    }
    if (dados.dataEnvio !== undefined) {
      campos.push('data_envio = ?')
      valores.push(dados.dataEnvio)
    }
    if (dados.dataRetornoPrevista !== undefined) {
      campos.push('data_retorno_prevista = ?')
      valores.push(dados.dataRetornoPrevista)
    }
    if (dados.dataRetorno !== undefined) {
      campos.push('data_retorno = ?')
      valores.push(dados.dataRetorno)
    }
    if (dados.custo !== undefined) {
      campos.push('custo = ?')
      valores.push(dados.custo)
    }
    if (dados.status !== undefined) {
      campos.push('status = ?')
      valores.push(dados.status)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE ordem_manutencao SET ${campos.join(', ')} WHERE id_ordem = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, CONTEXTO)
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  /** Conclusão, custo e restauração do equipamento na mesma transação. */
  async concluirComEfeitos(
    dados: OrdemManutencaoConcluirEntrada,
    efeitos: EfeitosManutencao,
  ): Promise<OrdemManutencao | null> {
    return this.transacao(async (cliente) => {
      const atual = await this.lerPorId(cliente, dados.id)
      if (!atual || atual.status === 'Concluída') return null
      if (!dados.dataRetorno) {
        throw new ErroDeDominio('DADOS_INVALIDOS', 'A data de retorno é obrigatória.')
      }

      const campos = ['data_retorno = ?', "status = 'Concluída'"]
      const valores: ParametroSql[] = [dados.dataRetorno]
      if (dados.custo !== undefined) {
        campos.push('custo = ?')
        valores.push(dados.custo)
      }
      valores.push(dados.id)

      try {
        await cliente.execute(
          `UPDATE ordem_manutencao SET ${campos.join(', ')} WHERE id_ordem = ?`,
          valores,
        )
        await this.aplicarEfeitos(cliente, atual.equipamentoId, efeitos)
      } catch (erro) {
        throw paraErroDominio(erro, CONTEXTO)
      }

      return this.lerPorId(cliente, dados.id)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE ordem_manutencao SET ativo = 0 WHERE id_ordem = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, CONTEXTO)
      }
    })
  }

  private async aplicarEfeitos(
    cliente: ClienteBanco,
    equipamentoId: number,
    efeitos: EfeitosManutencao,
  ): Promise<void> {
    await cliente.execute(
      `UPDATE equipamento
          SET estado_conservacao = ?, disponibilidade = ?
        WHERE id_equipamento = ? AND ativo = 1`,
      [efeitos.estadoConservacao, efeitos.disponibilidade, equipamentoId],
    )
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<OrdemManutencao | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id_ordem = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearOrdem(linha) : null
  }
}
