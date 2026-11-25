import type {
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  FornecedorListarFiltros,
  TipoFornecedor,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import {
  booleano,
  dataHora,
  numero,
  texto,
  textoEnumeradoOpcional,
  textoOpcional,
} from './mapeamento'
import type { RepositorioFornecedores } from './portas'
import { RepositorioBase } from './RepositorioBase'

const TIPOS: readonly TipoFornecedor[] = ['Compra', 'Manutenção', 'Ambos']

const CONSULTAR = `
  SELECT id_fornecedor AS id, nome, cnpj, telefone, email, tipo, ativo,
         atualizado_em AS atualizadoEm
  FROM fornecedor
`

function mapearFornecedor(linha: RegistroBanco): Fornecedor {
  return {
    id: numero(linha, 'id', 'FORNECEDOR'),
    nome: texto(linha, 'nome', 'FORNECEDOR'),
    cnpj: texto(linha, 'cnpj', 'FORNECEDOR'),
    telefone: textoOpcional(linha, 'telefone', 'FORNECEDOR'),
    email: textoOpcional(linha, 'email', 'FORNECEDOR'),
    tipo: textoEnumeradoOpcional(linha, 'tipo', 'FORNECEDOR', TIPOS),
    ativo: booleano(linha, 'ativo', 'FORNECEDOR'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'FORNECEDOR'),
  }
}

export class FornecedorRepositorio extends RepositorioBase implements RepositorioFornecedores {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: FornecedorListarFiltros = {}): Promise<readonly Fornecedor[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.nome !== undefined) {
      condicoes.push('nome LIKE ?')
      valores.push(`%${filtros.nome}%`)
    }
    if (filtros.tipo !== undefined) {
      condicoes.push('tipo = ?')
      valores.push(filtros.tipo)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY nome, id_fornecedor${paginacao}`,
        valores,
      )
      return linhas.map(mapearFornecedor)
    })
  }

  async buscarPorId(id: number): Promise<Fornecedor | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  async criar(dados: FornecedorCriarEntrada): Promise<Fornecedor> {
    return this.comCliente(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          'INSERT INTO fornecedor (nome, cnpj, telefone, email, tipo) VALUES (?, ?, ?, ?, ?)',
          [dados.nome, dados.cnpj, dados.telefone ?? null, dados.email ?? null, dados.tipo ?? null],
        )
        id = resultado.insertId
      } catch (erro) {
        throw paraErroDominio(erro, 'fornecedor')
      }

      const criado = await this.lerPorId(cliente, id)
      if (!criado) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Fornecedor não encontrado após a criação.')
      }
      return criado
    })
  }

  async atualizar(dados: FornecedorAtualizarEntrada): Promise<Fornecedor | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.nome !== undefined) {
      campos.push('nome = ?')
      valores.push(dados.nome)
    }
    if (dados.cnpj !== undefined) {
      campos.push('cnpj = ?')
      valores.push(dados.cnpj)
    }
    if (dados.telefone !== undefined) {
      campos.push('telefone = ?')
      valores.push(dados.telefone)
    }
    if (dados.email !== undefined) {
      campos.push('email = ?')
      valores.push(dados.email)
    }
    if (dados.tipo !== undefined) {
      campos.push('tipo = ?')
      valores.push(dados.tipo)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE fornecedor SET ${campos.join(', ')} WHERE id_fornecedor = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'fornecedor')
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE fornecedor SET ativo = 0 WHERE id_fornecedor = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'fornecedor')
      }
    })
  }

  async cnpjEmUso(cnpj: string, idExcluido?: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `SELECT COUNT(*) AS total FROM fornecedor
         WHERE cnpj = ? AND id_fornecedor <> COALESCE(?, -1)`,
        [cnpj, idExcluido ?? null],
      )
      return numero(linhas[0] ?? {}, 'total', 'FORNECEDOR') > 0
    })
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<Fornecedor | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id_fornecedor = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearFornecedor(linha) : null
  }
}
