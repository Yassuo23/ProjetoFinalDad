import type {
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  EstadoPosUso,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { booleano, dataHora, numero, textoEnumerado, textoOpcional } from './mapeamento'
import type { EfeitosDevolucao, RepositorioDevolucoes } from './portas'
import { RepositorioBase } from './RepositorioBase'

const ESTADOS: readonly EstadoPosUso[] = ['Perfeito', 'Com avarias leves', 'Danificado']

const CONSULTAR = `
  SELECT id_devolucao AS id, id_reserva AS reservaId,
         data_devolucao_efetiva AS dataDevolucaoEfetiva,
         estado_pos_uso AS estadoPosUso, observacoes, ativo,
         atualizado_em AS atualizadoEm
  FROM devolucao
`

function mapearDevolucao(linha: RegistroBanco): Devolucao {
  return {
    id: numero(linha, 'id', 'DEVOLUCAO'),
    reservaId: numero(linha, 'reservaId', 'DEVOLUCAO'),
    dataDevolucaoEfetiva: dataHora(linha, 'dataDevolucaoEfetiva', 'DEVOLUCAO'),
    estadoPosUso: textoEnumerado(linha, 'estadoPosUso', 'DEVOLUCAO', ESTADOS),
    observacoes: textoOpcional(linha, 'observacoes', 'DEVOLUCAO'),
    ativo: booleano(linha, 'ativo', 'DEVOLUCAO'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'DEVOLUCAO'),
  }
}

export class DevolucaoRepositorio extends RepositorioBase implements RepositorioDevolucoes {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: DevolucaoListarFiltros = {}): Promise<readonly Devolucao[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.reservaId !== undefined) {
      condicoes.push('id_reserva = ?')
      valores.push(filtros.reservaId)
    }
    if (filtros.estadoPosUso !== undefined) {
      condicoes.push('estado_pos_uso = ?')
      valores.push(filtros.estadoPosUso)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY id_devolucao DESC${paginacao}`,
        valores,
      )
      return linhas.map(mapearDevolucao)
    })
  }

  async buscarPorId(id: number): Promise<Devolucao | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  async buscarPorReserva(reservaId: number): Promise<Devolucao | null> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(`${CONSULTAR} WHERE id_reserva = ? LIMIT 1`, [reservaId])
      const linha = linhas[0]
      return linha ? mapearDevolucao(linha) : null
    })
  }

  /** A devolução e seus efeitos (multa e manutenção) são atômicos. */
  async criarComEfeitos(
    dados: DevolucaoCriarEntrada,
    efeitos: EfeitosDevolucao,
  ): Promise<Devolucao> {
    return this.transacao(async (cliente) => {
      const colunas = ['id_reserva', 'estado_pos_uso', 'observacoes']
      const valores: ParametroSql[] = [
        dados.reservaId,
        dados.estadoPosUso,
        dados.observacoes ?? null,
      ]
      if (dados.dataDevolucaoEfetiva !== undefined) {
        colunas.push('data_devolucao_efetiva')
        valores.push(dados.dataDevolucaoEfetiva)
      }

      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO devolucao (${colunas.join(', ')}) VALUES (${colunas.map(() => '?').join(', ')})`,
          valores,
        )
        id = resultado.insertId

        if (efeitos.valorMulta > 0) {
          await cliente.execute(
            `UPDATE pagamento
             SET valor_multa = ?, valor_total = valor_base + ?
             WHERE id_reserva = ?`,
            [efeitos.valorMulta, efeitos.valorMulta, dados.reservaId],
          )
        }

        if (efeitos.manutencao) {
          await cliente.execute(
            `UPDATE equipamento
             SET estado_conservacao = 'Em Manutenção'
             WHERE id_equipamento IN (
               SELECT id_equipamento FROM item_reserva WHERE id_reserva = ?
             ) AND ativo = 1`,
            [dados.reservaId],
          )
        }
      } catch (erro) {
        throw paraErroDominio(erro, 'devolução')
      }

      const criada = await this.lerPorId(cliente, id)
      if (!criada) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Devolução não encontrada após a criação.')
      }
      return criada
    })
  }

  async atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.dataDevolucaoEfetiva !== undefined) {
      campos.push('data_devolucao_efetiva = ?')
      valores.push(dados.dataDevolucaoEfetiva)
    }
    if (dados.estadoPosUso !== undefined) {
      campos.push('estado_pos_uso = ?')
      valores.push(dados.estadoPosUso)
    }
    if (dados.observacoes !== undefined) {
      campos.push('observacoes = ?')
      valores.push(dados.observacoes)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE devolucao SET ${campos.join(', ')} WHERE id_devolucao = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'devolução')
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE devolucao SET ativo = 0 WHERE id_devolucao = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'devolução')
      }
    })
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<Devolucao | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id_devolucao = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearDevolucao(linha) : null
  }
}
