import type {
  ChaveItemReservaEntrada,
  ItemReserva,
  ItemReservaAtualizarEntrada,
  ItemReservaCriarEntrada,
  ItemReservaListarFiltros,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { numero } from './mapeamento'
import type { RepositorioItensReserva } from './portas'
import { RepositorioBase } from './RepositorioBase'

const CONSULTAR = `
  SELECT id_reserva AS reservaId, id_equipamento AS equipamentoId,
         valor_diaria AS valorDiaria
  FROM item_reserva
`

function mapearItem(linha: RegistroBanco): ItemReserva {
  return {
    reservaId: numero(linha, 'reservaId', 'ITEM_RESERVA'),
    equipamentoId: numero(linha, 'equipamentoId', 'ITEM_RESERVA'),
    valorDiaria: numero(linha, 'valorDiaria', 'ITEM_RESERVA'),
  }
}

/** Tabela associativa: não tem `ativo` — `remover` é DELETE físico. */
export class ItemReservaRepositorio extends RepositorioBase implements RepositorioItensReserva {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: ItemReservaListarFiltros = {}): Promise<readonly ItemReserva[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.reservaId !== undefined) {
      condicoes.push('id_reserva = ?')
      valores.push(filtros.reservaId)
    }
    if (filtros.equipamentoId !== undefined) {
      condicoes.push('id_equipamento = ?')
      valores.push(filtros.equipamentoId)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY id_reserva, id_equipamento${paginacao}`,
        valores,
      )
      return linhas.map(mapearItem)
    })
  }

  async buscarPorId(chave: ChaveItemReservaEntrada): Promise<ItemReserva | null> {
    return this.comCliente((cliente) => this.lerPorChave(cliente, chave))
  }

  async criar(dados: ItemReservaCriarEntrada): Promise<ItemReserva> {
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `INSERT INTO item_reserva (id_reserva, id_equipamento, valor_diaria)
           VALUES (?, ?, ?)`,
          [dados.reservaId, dados.equipamentoId, dados.valorDiaria],
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'item de reserva')
      }

      const criado = await this.lerPorChave(cliente, dados)
      if (!criado) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Item de reserva não encontrado após a criação.')
      }
      return criado
    })
  }

  async atualizar(dados: ItemReservaAtualizarEntrada): Promise<ItemReserva | null> {
    const valorDiaria = dados.valorDiaria
    if (valorDiaria === undefined) return null

    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE item_reserva SET valor_diaria = ?
           WHERE id_reserva = ? AND id_equipamento = ?`,
          [valorDiaria, dados.reservaId, dados.equipamentoId],
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'item de reserva')
      }
      return this.lerPorChave(cliente, dados)
    })
  }

  async remover(chave: ChaveItemReservaEntrada): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'DELETE FROM item_reserva WHERE id_reserva = ? AND id_equipamento = ?',
          [chave.reservaId, chave.equipamentoId],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'item de reserva')
      }
    })
  }

  private async lerPorChave(
    cliente: ClienteBanco,
    chave: ChaveItemReservaEntrada,
  ): Promise<ItemReserva | null> {
    const linhas = await cliente.query(
      `${CONSULTAR} WHERE id_reserva = ? AND id_equipamento = ? LIMIT 1`,
      [chave.reservaId, chave.equipamentoId],
    )
    const linha = linhas[0]
    return linha ? mapearItem(linha) : null
  }
}
