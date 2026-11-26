import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { booleano, dataHora, numero, texto, textoOpcional } from './mapeamento'
import type { RepositorioClientes } from './portas'
import { RepositorioBase } from './RepositorioBase'

const CONSULTAR = `
  SELECT id_cliente AS id, nome, cpf, telefone, email, cep, logradouro, numero,
         complemento, bairro, cidade, uf, ativo, atualizado_em AS atualizadoEm
  FROM cliente
`

function mapearCliente(linha: RegistroBanco): Cliente {
  return {
    id: numero(linha, 'id', 'CLIENTE'),
    nome: texto(linha, 'nome', 'CLIENTE'),
    cpf: texto(linha, 'cpf', 'CLIENTE'),
    telefone: textoOpcional(linha, 'telefone', 'CLIENTE'),
    email: textoOpcional(linha, 'email', 'CLIENTE'),
    cep: textoOpcional(linha, 'cep', 'CLIENTE'),
    logradouro: textoOpcional(linha, 'logradouro', 'CLIENTE'),
    numero: textoOpcional(linha, 'numero', 'CLIENTE'),
    complemento: textoOpcional(linha, 'complemento', 'CLIENTE'),
    bairro: textoOpcional(linha, 'bairro', 'CLIENTE'),
    cidade: textoOpcional(linha, 'cidade', 'CLIENTE'),
    uf: textoOpcional(linha, 'uf', 'CLIENTE'),
    ativo: booleano(linha, 'ativo', 'CLIENTE'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'CLIENTE'),
  }
}

export class ClienteRepositorio extends RepositorioBase implements RepositorioClientes {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(
    filtros: ClienteListarFiltros = {},
    idClienteProprietario?: number,
  ): Promise<readonly Cliente[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (idClienteProprietario !== undefined) {
      condicoes.push('id_cliente = ?')
      valores.push(idClienteProprietario)
    }
    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.nome !== undefined) {
      condicoes.push('nome LIKE ?')
      valores.push(`%${filtros.nome}%`)
    }
    if (filtros.cpf !== undefined) {
      condicoes.push('cpf LIKE ?')
      valores.push(`%${filtros.cpf}%`)
    }
    if (filtros.cidade !== undefined) {
      condicoes.push('cidade LIKE ?')
      valores.push(`%${filtros.cidade}%`)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY nome, id_cliente${paginacao}`,
        valores,
      )
      return linhas.map(mapearCliente)
    })
  }

  async buscarPorId(id: number, idClienteProprietario?: number): Promise<Cliente | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id, idClienteProprietario))
  }

  async criar(dados: ClienteCriarEntrada): Promise<Cliente> {
    return this.comCliente(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO cliente
             (nome, cpf, telefone, email, cep, logradouro, numero, complemento, bairro, cidade, uf)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dados.nome,
            dados.cpf,
            dados.telefone ?? null,
            dados.email ?? null,
            dados.cep ?? null,
            dados.logradouro ?? null,
            dados.numero ?? null,
            dados.complemento ?? null,
            dados.bairro ?? null,
            dados.cidade ?? null,
            dados.uf ?? null,
          ],
        )
        id = resultado.insertId
      } catch (erro) {
        throw paraErroDominio(erro, 'cliente')
      }

      const criado = await this.lerPorId(cliente, id)
      if (!criado)
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Cliente não encontrado após a criação.')
      return criado
    })
  }

  async atualizar(
    dados: ClienteAtualizarEntrada,
    idClienteProprietario?: number,
  ): Promise<Cliente | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    const camposTexto = [
      ['nome', dados.nome],
      ['cpf', dados.cpf],
      ['telefone', dados.telefone],
      ['email', dados.email],
      ['cep', dados.cep],
      ['logradouro', dados.logradouro],
      ['numero', dados.numero],
      ['complemento', dados.complemento],
      ['bairro', dados.bairro],
      ['cidade', dados.cidade],
      ['uf', dados.uf],
    ] as const

    for (const [coluna, valor] of camposTexto) {
      if (valor !== undefined) {
        campos.push(`${coluna} = ?`)
        valores.push(valor)
      }
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    let condicaoDono = ''
    if (idClienteProprietario !== undefined) {
      condicaoDono = ' AND id_cliente = ?'
      valores.push(idClienteProprietario)
    }
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE cliente SET ${campos.join(', ')} WHERE id_cliente = ?${condicaoDono}`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'cliente')
      }
      return this.lerPorId(cliente, dados.id, idClienteProprietario)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE cliente SET ativo = 0 WHERE id_cliente = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'cliente')
      }
    })
  }

  async cpfEmUso(cpf: string, idExcluido?: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `SELECT COUNT(*) AS total FROM cliente
         WHERE cpf = ? AND id_cliente <> COALESCE(?, -1)`,
        [cpf, idExcluido ?? null],
      )
      return numero(linhas[0] ?? {}, 'total', 'CLIENTE') > 0
    })
  }

  private async lerPorId(
    cliente: ClienteBanco,
    id: number,
    idClienteProprietario?: number,
  ): Promise<Cliente | null> {
    const valores: ParametroSql[] = [id]
    let condicaoDono = ''
    if (idClienteProprietario !== undefined) {
      condicaoDono = ' AND id_cliente = ?'
      valores.push(idClienteProprietario)
    }
    const linhas = await cliente.query(
      `${CONSULTAR} WHERE id_cliente = ?${condicaoDono} LIMIT 1`,
      valores,
    )
    const linha = linhas[0]
    return linha ? mapearCliente(linha) : null
  }
}
