import type {
  Sessao,
  Usuario,
  UsuarioPublico,
} from '../../shared/contratos/modelos'
import type { RepositorioUsuarios } from '../repositorios/portas'
import { ErroDeDominio } from './ErroDeDominio'
import type { GestorSessao, ServicoSenhas, ServicoUsuarios } from './portas'
import { gerarHash, conferirSenha, validarPoliticaSenha } from './SenhaHash'

const servicoSenhasPadrao: ServicoSenhas = {
  gerarHash,
  conferir: conferirSenha,
  validarPolitica: validarPoliticaSenha,
}

/** Projeção explícita: `senhaHash` NUNCA sai do processo principal. */
function paraPublico(usuario: Usuario): UsuarioPublico {
  return {
    id: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
    ativo: usuario.ativo,
    atualizadoEm: usuario.atualizadoEm,
  }
}

function paraSessao(usuario: Usuario, clienteId: number | null = null): Sessao {
  return {
    usuarioId: usuario.id,
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil,
    clienteId,
  }
}

function normalizarLogin(login: string): string {
  return login.trim().toLowerCase()
}

/** Administração de usuários: somente chamada por canais `usuarios:*`. */
export class UsuarioServico implements ServicoUsuarios {
  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly sessao: GestorSessao,
    private readonly senhas: ServicoSenhas = servicoSenhasPadrao,
  ) {}

  async listar(filtros?: Parameters<RepositorioUsuarios['listar']>[0]): Promise<readonly UsuarioPublico[]> {
    const usuarios = await this.usuarios.listar(filtros)
    return usuarios.map(paraPublico)
  }

  async buscarPorId(id: number): Promise<UsuarioPublico> {
    const usuario = await this.usuarios.buscarPorId(id)
    if (!usuario) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Usuário não encontrado.')
    }
    return paraPublico(usuario)
  }

  async criar(dados: {
    readonly nome: string
    readonly login: string
    readonly senha: string
    readonly perfil: Usuario['perfil']
  }): Promise<UsuarioPublico> {
    // ADR 0009: canal administrativo nunca cria Cliente; dupla validação com
    // o schema, que já restringe o enum a Administrador/Atendente.
    if (dados.perfil === 'Cliente') {
      throw new ErroDeDominio('PERFIL_INVALIDO', 'Perfil não permitido neste canal.')
    }
    this.senhas.validarPolitica(dados.senha)
    const login = normalizarLogin(dados.login)
    if (await this.usuarios.loginEmUso(login)) {
      throw new ErroDeDominio('LOGIN_DUPLICADO', 'Login já está em uso.')
    }
    const criado = await this.usuarios.criar({
      nome: dados.nome,
      login,
      senhaHash: await this.senhas.gerarHash(dados.senha),
      perfil: dados.perfil,
    })
    return paraPublico(criado)
  }

  async atualizar(dados: {
    readonly id: number
    readonly nome?: string
    readonly login?: string
    readonly perfil?: Usuario['perfil']
    readonly ativo?: boolean
  }): Promise<UsuarioPublico> {
    if (dados.perfil === 'Cliente') {
      throw new ErroDeDominio('PERFIL_INVALIDO', 'Perfil não permitido neste canal.')
    }
    const login = dados.login === undefined ? undefined : normalizarLogin(dados.login)
    if (login !== undefined && (await this.usuarios.loginEmUso(login, dados.id))) {
      throw new ErroDeDominio('LOGIN_DUPLICADO', 'Login já está em uso.')
    }
    const atualizado = await this.usuarios.atualizar({ ...dados, login })
    if (!atualizado) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Usuário não encontrado.')
    }

    const sessao = this.sessao.sessao()
    if (sessao?.usuarioId === dados.id) {
      const clienteId = atualizado.perfil === 'Cliente' ? sessao.clienteId ?? null : null
      this.sessao.atualizarSessao(atualizado.ativo ? paraSessao(atualizado, clienteId) : null)
    }
    return paraPublico(atualizado)
  }

  /** Soft delete: a sessão de um usuário inativado é encerrada no próprio main. */
  async inativar(id: number): Promise<void> {
    if (this.sessao.sessao()?.usuarioId === id) {
      throw new ErroDeDominio('DADOS_INVALIDOS', 'Não é possível inativar o próprio usuário.')
    }
    await this.atualizar({ id, ativo: false })
  }

  async alterarSenha(dados: {
    readonly id: number
    readonly senhaNova: string
    readonly senhaAtual?: string
  }): Promise<void> {
    const alvo = await this.usuarios.buscarPorId(dados.id)
    if (!alvo) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Usuário não encontrado.')
    }

    const propria = this.sessao.sessao()?.usuarioId === dados.id
    if (dados.senhaAtual === undefined && propria) {
      throw new ErroDeDominio(
        'CREDENCIAIS_INVALIDAS',
        'Informe a senha atual para alterar a própria senha.',
      )
    }
    if (
      dados.senhaAtual !== undefined &&
      !(await this.senhas.conferir(dados.senhaAtual, alvo.senhaHash))
    ) {
      throw new ErroDeDominio('CREDENCIAIS_INVALIDAS', 'usuário ou senha inválidos')
    }

    this.senhas.validarPolitica(dados.senhaNova)
    const alterada = await this.usuarios.atualizarSenha(
      dados.id,
      await this.senhas.gerarHash(dados.senhaNova),
    )
    if (!alterada) {
      throw new ErroDeDominio('NAO_ENCONTRADO', 'Usuário não encontrado.')
    }
  }
}
