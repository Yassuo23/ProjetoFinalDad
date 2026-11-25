import type {
  FormaPagamento,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
  StatusPagamento,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import {
  booleano,
  dataHora,
  dataHoraOpcional,
  numero,
  textoEnumerado,
  textoEnumeradoOpcional,
} from './mapeamento'
import type { RepositorioPagamentos } from './portas'
import { RepositorioBase } from './RepositorioBase'

const FORMAS: readonly FormaPagamento[] = ['Pix', 'Cartão de Crédito', 'Dinheiro']
const STATUS: readonly StatusPagamento[] = ['Pendente', 'Pago', 'Estornado']

const CONSULTAR = `
  SELECT id_pagamento AS id, id_reserva AS reservaId,
         valor_base AS valorBase, valor_multa AS valorMulta, valor_total AS valorTotal,
         forma_pagamento AS formaPagamento, status_pagamento AS statusPagamento,
         data_pagamento AS dataPagamento, ativo, atualizado_em AS atualizadoEm
  FROM pagamento
`

function mapearPagamento(linha: RegistroBanco): Pagamento {
  return {
    id: numero(linha, 'id', 'PAGAMENTO'),
    reservaId: numero(linha, 'reservaId', 'PAGAMENTO'),
    valorBase: numero(linha, 'valorBase', 'PAGAMENTO'),
    valorMulta: numero(linha, 'valorMulta', 'PAGAMENTO'),
    valorTotal: numero(linha, 'valorTotal', 'PAGAMENTO'),
    formaPagamento: textoEnumeradoOpcional(linha, 'formaPagamento', 'PAGAMENTO', FORMAS),
    statusPagamento: textoEnumerado(linha, 'statusPagamento', 'PAGAMENTO', STATUS),
    dataPagamento: dataHoraOpcional(linha, 'dataPagamento', 'PAGAMENTO'),
    ativo: booleano(linha, 'ativo', 'PAGAMENTO'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'PAGAMENTO'),
  }
}

export class PagamentoRepositorio extends RepositorioBase implements RepositorioPagamentos {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: PagamentoListarFiltros = {}): Promise<readonly Pagamento[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.reservaId !== undefined) {
      condicoes.push('id_reserva = ?')
      valores.push(filtros.reservaId)
    }
    if (filtros.statusPagamento !== undefined) {
      condicoes.push('status_pagamento = ?')
      valores.push(filtros.statusPagamento)
    }
    if (filtros.formaPagamento !== undefined) {
      condicoes.push('forma_pagamento = ?')
      valores.push(filtros.formaPagamento)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY id_reserva, id_pagamento${paginacao}`,
        valores,
      )
      return linhas.map(mapearPagamento)
    })
  }

  async buscarPorId(id: number): Promise<Pagamento | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  async criar(dados: PagamentoCriarEntrada): Promise<Pagamento> {
    const multa = dados.valorMulta ?? 0
    return this.comCliente(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO pagamento
             (id_reserva, valor_base, valor_multa, valor_total, forma_pagamento,
              status_pagamento, data_pagamento)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            dados.reservaId,
            dados.valorBase,
            multa,
            dados.valorBase + multa,
            dados.formaPagamento ?? null,
            dados.statusPagamento ?? 'Pendente',
            dados.dataPagamento ?? null,
          ],
        )
        id = resultado.insertId
      } catch (erro) {
        throw paraErroDominio(erro, 'pagamento')
      }

      const criado = await this.lerPorId(cliente, id)
      if (!criado)
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Pagamento não encontrado após a criação.')
      return criado
    })
  }

  async atualizar(dados: PagamentoAtualizarEntrada): Promise<Pagamento | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.reservaId !== undefined) {
      campos.push('id_reserva = ?')
      valores.push(dados.reservaId)
    }
    if (dados.valorBase !== undefined) {
      campos.push('valor_base = ?')
      valores.push(dados.valorBase)
    }
    if (dados.valorMulta !== undefined) {
      campos.push('valor_multa = ?')
      valores.push(dados.valorMulta)
    }
    if (dados.formaPagamento !== undefined) {
      campos.push('forma_pagamento = ?')
      valores.push(dados.formaPagamento)
    }
    if (dados.statusPagamento !== undefined) {
      campos.push('status_pagamento = ?')
      valores.push(dados.statusPagamento)
    }
    if (dados.dataPagamento !== undefined) {
      campos.push('data_pagamento = ?')
      valores.push(dados.dataPagamento)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE pagamento SET ${campos.join(', ')} WHERE id_pagamento = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'pagamento')
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE pagamento SET ativo = 0 WHERE id_pagamento = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'pagamento')
      }
    })
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<Pagamento | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id_pagamento = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearPagamento(linha) : null
  }
}
