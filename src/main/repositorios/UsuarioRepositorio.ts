import type { PerfilUsuario, Usuario, UsuarioAtualizarEntrada, UsuarioListarFiltros } from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { booleano, dataHora, numero, texto, textoEnumerado } from './mapeamento'
import type { DadosCriacaoUsuario, RepositorioUsuarios } from './portas'
import { RepositorioBase } from './RepositorioBase'

/** ADR 0009: contas Cliente também precisam ser lidas pelo login/sessão. */
const PERFIS: readonly PerfilUsuario[] = ['Administrador', 'Atendente', 'Cliente']

/** `senhaHash` é lido apenas aqui e nos serviços do main; nunca é devolvido ao IPC. */
const CONSULTAR = `
  SELECT id_usuario AS id, nome, login, senha_hash AS senhaHash, perfil, ativo,
         atualizado_em AS atualizadoEm
  FROM usuario
`

function mapearUsuario(linha: RegistroBanco): Usuario {
  return {
    id: numero(linha, 'id', 'USUARIO'),
    nome: texto(linha, 'nome', 'USUARIO'),
    login: texto(linha, 'login', 'USUARIO'),
    senhaHash: texto(linha, 'senhaHash', 'USUARIO'),
    perfil: textoEnumerado(linha, 'perfil', 'USUARIO', PERFIS),
    ativo: booleano(linha, 'ativo', 'USUARIO'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'USUARIO'),
  }
}

/** Traduz apenas a violação de UNIQUE(login) para o código do contrato. */
function paraErroUsuario(erro: unknown): ErroDeDominio {
  const traduzido = paraErroDominio(erro, 'usuário')
  if (traduzido.codigo === 'REGISTRO_DUPLICADO') {
    return new ErroDeDominio('LOGIN_DUPLICADO', 'Login já está em uso.')
  }
  return traduzido
}

export class UsuarioRepositorio extends RepositorioBase implements RepositorioUsuarios {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  contar(): Promise<number> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query('SELECT COUNT(*) AS total FROM usuario')
      return numero(linhas[0] ?? {}, 'total', 'USUARIO')
    })
  }

  async listar(filtros: UsuarioListarFiltros = {}): Promise<readonly Usuario[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.nome !== undefined) {
      condicoes.push('nome LIKE ?')
      valores.push(`%${filtros.nome}%`)
    }
    if (filtros.login !== undefined) {
      condicoes.push('login LIKE ?')
      valores.push(`%${filtros.login}%`)
    }
    if (filtros.perfil !== undefined) {
      condicoes.push('perfil = ?')
      valores.push(filtros.perfil)
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY nome, id_usuario${paginacao}`,
        valores,
      )
      return linhas.map(mapearUsuario)
    })
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  async buscarPorLogin(login: string): Promise<Usuario | null> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(`${CONSULTAR} WHERE login = ? LIMIT 1`, [login])
      const linha = linhas[0]
      return linha ? mapearUsuario(linha) : null
    })
  }

  async loginEmUso(login: string, idExcluido?: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `SELECT COUNT(*) AS total FROM usuario
          WHERE login = ? AND id_usuario <> COALESCE(?, -1)`,
        [login, idExcluido ?? null],
      )
      return numero(linhas[0] ?? {}, 'total', 'USUARIO') > 0
    })
  }

  async criar(dados: DadosCriacaoUsuario): Promise<Usuario> {
    return this.comCliente(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO usuario (nome, login, senha_hash, perfil)
           VALUES (?, ?, ?, ?)`,
          [dados.nome, dados.login, dados.senhaHash, dados.perfil],
        )
        id = resultado.insertId
      } catch (erro) {
        throw paraErroUsuario(erro)
      }
      const criado = await this.lerPorId(cliente, id)
      if (!criado) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Usuário não encontrado após a criação.')
      }
      return criado
    })
  }

  async atualizar(dados: UsuarioAtualizarEntrada): Promise<Usuario | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.nome !== undefined) {
      campos.push('nome = ?')
      valores.push(dados.nome)
    }
    if (dados.login !== undefined) {
      campos.push('login = ?')
      valores.push(dados.login)
    }
    if (dados.perfil !== undefined) {
      campos.push('perfil = ?')
      valores.push(dados.perfil)
    }
    if (dados.ativo !== undefined) {
      campos.push('ativo = ?')
      valores.push(dados.ativo ? 1 : 0)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE usuario SET ${campos.join(', ')} WHERE id_usuario = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroUsuario(erro)
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  async atualizarSenha(id: number, senhaHash: string): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const resultado = await cliente.execute(
        'UPDATE usuario SET senha_hash = ? WHERE id_usuario = ?',
        [senhaHash, id],
      )
      return resultado.afetadas > 0
    })
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<Usuario | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id_usuario = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearUsuario(linha) : null
  }
}
