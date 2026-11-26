import type {
  Categoria,
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaDetalhe,
  CategoriaListarFiltros,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { booleano, dataHora, numero, texto, textoOpcional } from './mapeamento'
import type { RepositorioCategorias } from './portas'
import { RepositorioBase } from './RepositorioBase'

const CONSULTAR = `
  SELECT id, nome, descricao, ativo, atualizado_em AS atualizadoEm
  FROM categorias
`

function mapearCategoria(linha: RegistroBanco): CategoriaDetalhe {
  return {
    id: numero(linha, 'id', 'CATEGORIA'),
    nome: texto(linha, 'nome', 'CATEGORIA'),
    descricao: textoOpcional(linha, 'descricao', 'CATEGORIA'),
    ativo: booleano(linha, 'ativo', 'CATEGORIA'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'CATEGORIA'),
  }
}

export class CategoriaRepositorio extends RepositorioBase implements RepositorioCategorias {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: CategoriaListarFiltros = {}): Promise<readonly Categoria[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.nome !== undefined) {
      condicoes.push('nome LIKE ?')
      valores.push(`%${filtros.nome}%`)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY nome, id${paginacao}`,
        valores,
      )
      return linhas.map(mapearCategoria)
    })
  }

  async buscarPorId(id: number): Promise<CategoriaDetalhe | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  async criar(dados: CategoriaCriarEntrada): Promise<CategoriaDetalhe> {
    return this.comCliente(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          'INSERT INTO categorias (nome, descricao) VALUES (?, ?)',
          [dados.nome, dados.descricao ?? null],
        )
        id = resultado.insertId
      } catch (erro) {
        throw paraErroDominio(erro, 'categoria')
      }
      const criada = await this.lerPorId(cliente, id)
      if (!criada) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Categoria não encontrada após a criação.')
      }
      return criada
    })
  }

  async atualizar(dados: CategoriaAtualizarEntrada): Promise<CategoriaDetalhe | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.nome !== undefined) {
      campos.push('nome = ?')
      valores.push(dados.nome)
    }
    if (dados.descricao !== undefined) {
      campos.push('descricao = ?')
      valores.push(dados.descricao)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE categorias SET ${campos.join(', ')} WHERE id = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'categoria')
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const resultado = await cliente.execute(
        'UPDATE categorias SET ativo = 0 WHERE id = ? AND ativo = 1',
        [id],
      )
      return resultado.afetadas > 0
    })
  }

  async nomeEmUso(nome: string, idExcluido?: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `SELECT COUNT(*) AS total FROM categorias
          WHERE nome = ? AND id <> COALESCE(?, -1)`,
        [nome, idExcluido ?? null],
      )
      return numero(linhas[0] ?? {}, 'total', 'CATEGORIA') > 0
    })
  }

  /** `equipamento.categoria` guarda o nome (migração 002), não um id. */
  async emUsoPorEquipamento(nome: string): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        'SELECT COUNT(*) AS total FROM equipamento WHERE categoria = ?',
        [nome],
      )
      return numero(linhas[0] ?? {}, 'total', 'CATEGORIA') > 0
    })
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<CategoriaDetalhe | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearCategoria(linha) : null
  }
}
