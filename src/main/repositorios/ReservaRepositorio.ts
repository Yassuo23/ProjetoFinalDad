import type {
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
  StatusReserva,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { booleano, dataApenas, dataHora, numero, textoEnumerado, textoOpcional } from './mapeamento'
import type { RepositorioReservas } from './portas'
import { RepositorioBase } from './RepositorioBase'

const STATUS: readonly StatusReserva[] = ['Pendente', 'Confirmada', 'Cancelada', 'Concluída']

const CONSULTAR = `
  SELECT id_reserva AS id, id_cliente AS clienteId, data_reserva AS dataReserva,
         data_inicio AS dataInicio, data_fim AS dataFim,
         status_reserva AS statusReserva, previsao_tempo AS previsaoTempo,
         ativo, atualizado_em AS atualizadoEm
  FROM reserva
`

function mapearReserva(linha: RegistroBanco): Reserva {
  return {
    id: numero(linha, 'id', 'RESERVA'),
    clienteId: numero(linha, 'clienteId', 'RESERVA'),
    dataReserva: dataHora(linha, 'dataReserva', 'RESERVA'),
    dataInicio: dataApenas(linha, 'dataInicio', 'RESERVA'),
    dataFim: dataApenas(linha, 'dataFim', 'RESERVA'),
    statusReserva: textoEnumerado(linha, 'statusReserva', 'RESERVA', STATUS),
    previsaoTempo: textoOpcional(linha, 'previsaoTempo', 'RESERVA'),
    ativo: booleano(linha, 'ativo', 'RESERVA'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'RESERVA'),
  }
}

export class ReservaRepositorio extends RepositorioBase implements RepositorioReservas {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(
    filtros: ReservaListarFiltros = {},
    idClienteProprietario?: number,
  ): Promise<readonly Reserva[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (idClienteProprietario !== undefined) {
      condicoes.push('id_cliente = ?')
      valores.push(idClienteProprietario)
    }
    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.clienteId !== undefined) {
      condicoes.push('id_cliente = ?')
      valores.push(filtros.clienteId)
    }
    if (filtros.statusReserva !== undefined) {
      condicoes.push('status_reserva = ?')
      valores.push(filtros.statusReserva)
    }
    if (filtros.dataInicio !== undefined) {
      condicoes.push('data_inicio >= ?')
      valores.push(filtros.dataInicio)
    }
    if (filtros.dataFim !== undefined) {
      condicoes.push('data_fim <= ?')
      valores.push(filtros.dataFim)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY data_inicio, id_reserva${paginacao}`,
        valores,
      )
      return linhas.map(mapearReserva)
    })
  }

  async buscarPorId(id: number, idClienteProprietario?: number): Promise<Reserva | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id, idClienteProprietario))
  }

  async criar(dados: ReservaCriarEntrada, idClienteProprietario?: number): Promise<Reserva> {
    const clienteId = idClienteProprietario ?? dados.clienteId
    return this.transacao(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO reserva (id_cliente, data_inicio, data_fim, previsao_tempo)
           VALUES (?, ?, ?, ?)`,
          [clienteId, dados.dataInicio, dados.dataFim, dados.previsaoTempo ?? null],
        )
        id = resultado.insertId
        for (const item of dados.itens) {
          await cliente.execute(
            `INSERT INTO item_reserva (id_reserva, id_equipamento, valor_diaria)
             VALUES (?, ?, ?)`,
            [id, item.equipamentoId, item.valorDiaria],
          )
        }
      } catch (erro) {
        throw paraErroDominio(erro, 'reserva')
      }

      const criada = await this.lerPorId(cliente, id, idClienteProprietario)
      if (!criada)
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Reserva não encontrada após a criação.')
      return criada
    })
  }

  async atualizar(
    dados: ReservaAtualizarEntrada,
    idClienteProprietario?: number,
  ): Promise<Reserva | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.clienteId !== undefined) {
      campos.push('id_cliente = ?')
      valores.push(dados.clienteId)
    }
    if (dados.dataInicio !== undefined) {
      campos.push('data_inicio = ?')
      valores.push(dados.dataInicio)
    }
    if (dados.dataFim !== undefined) {
      campos.push('data_fim = ?')
      valores.push(dados.dataFim)
    }
    if (dados.statusReserva !== undefined) {
      campos.push('status_reserva = ?')
      valores.push(dados.statusReserva)
    }
    if (dados.previsaoTempo !== undefined) {
      campos.push('previsao_tempo = ?')
      valores.push(dados.previsaoTempo)
    }
    if (campos.length === 0 && dados.itens === undefined) return null

    return this.transacao(async (cliente) => {
      if (!(await this.lerPorId(cliente, dados.id, idClienteProprietario))) return null

      let condicaoDono = ''
      const valoresDono: ParametroSql[] = []
      if (idClienteProprietario !== undefined) {
        condicaoDono = ' AND id_cliente = ?'
        valoresDono.push(idClienteProprietario)
      }

      try {
        if (campos.length > 0) {
          await cliente.execute(
            `UPDATE reserva SET ${campos.join(', ')} WHERE id_reserva = ?${condicaoDono}`,
            [...valores, dados.id, ...valoresDono],
          )
        } else {
          // Somente itens mudaram: o gatilho `ON UPDATE` do MySQL não dispara sem
          // alteração de coluna, então a auditoria é tocada explicitamente.
          await cliente.execute(
            `UPDATE reserva SET atualizado_em = CURRENT_TIMESTAMP WHERE id_reserva = ?${condicaoDono}`,
            [dados.id, ...valoresDono],
          )
        }

        if (dados.itens !== undefined) {
          await cliente.execute('DELETE FROM item_reserva WHERE id_reserva = ?', [dados.id])
          for (const item of dados.itens) {
            await cliente.execute(
              `INSERT INTO item_reserva (id_reserva, id_equipamento, valor_diaria)
               VALUES (?, ?, ?)`,
              [dados.id, item.equipamentoId, item.valorDiaria],
            )
          }
        }
      } catch (erro) {
        throw paraErroDominio(erro, 'reserva')
      }

      const atualizada = await this.lerPorId(cliente, dados.id, idClienteProprietario)
      if (!atualizada) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Reserva não encontrada após a atualização.')
      }
      return atualizada
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE reserva SET ativo = 0 WHERE id_reserva = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'reserva')
      }
    })
  }

  private async lerPorId(
    cliente: ClienteBanco,
    id: number,
    idClienteProprietario?: number,
  ): Promise<Reserva | null> {
    const valores: ParametroSql[] = [id]
    let condicaoDono = ''
    if (idClienteProprietario !== undefined) {
      condicaoDono = ' AND id_cliente = ?'
      valores.push(idClienteProprietario)
    }
    const linhas = await cliente.query(
      `${CONSULTAR} WHERE id_reserva = ?${condicaoDono} LIMIT 1`,
      valores,
    )
    const linha = linhas[0]
    return linha ? mapearReserva(linha) : null
  }
}
