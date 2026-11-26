import { describe, expect, it } from 'vitest'
import type {
  CadastrarClienteEntrada,
  Cliente,
  Usuario,
  UsuarioAtualizarEntrada,
  UsuarioListarFiltros,
} from '../../shared/contratos/modelos'
import type {
  DadosCadastroCliente,
  DadosCriacaoUsuario,
  RepositorioCadastroCliente,
  RepositorioUsuarios,
  UsuarioEClienteCriados,
} from '../repositorios/portas'
import {
  AutenticacaoServico,
  MENSAGEM_CADASTRO_INDISPONIVEL,
  MENSAGEM_CREDENCIAIS_INVALIDAS,
} from './AutenticacaoServico'
import type { ServicoSenhas } from './portas'
import { validarPoliticaSenha } from './SenhaHash'
import { UsuarioServico } from './UsuarioServico'

const AUDITORIA = '2026-11-25T12:00:00.000Z'

class RepositorioUsuariosFalso implements RepositorioUsuarios {
  readonly usuarios: Usuario[] = []
  private proximoId = 1

  constructor(iniciais: readonly Usuario[] = []) {
    this.usuarios.push(...iniciais)
    this.proximoId = this.usuarios.length + 1
  }

  async contar(): Promise<number> {
    return this.usuarios.length
  }

  async listar(_filtros: UsuarioListarFiltros = {}): Promise<readonly Usuario[]> {
    return [...this.usuarios]
  }

  async buscarPorId(id: number): Promise<Usuario | null> {
    return this.usuarios.find((usuario) => usuario.id === id) ?? null
  }

  async buscarPorLogin(login: string): Promise<Usuario | null> {
    return this.usuarios.find((usuario) => usuario.login === login) ?? null
  }

  async loginEmUso(login: string, idExcluido?: number): Promise<boolean> {
    return this.usuarios.some(
      (usuario) => usuario.login === login && usuario.id !== (idExcluido ?? -1),
    )
  }

  async criar(dados: DadosCriacaoUsuario): Promise<Usuario> {
    const usuario: Usuario = {
      id: this.proximoId++,
      nome: dados.nome,
      login: dados.login,
      senhaHash: dados.senhaHash,
      perfil: dados.perfil,
      ativo: true,
      atualizadoEm: AUDITORIA,
    }
    this.usuarios.push(usuario)
    return usuario
  }

  async atualizar(dados: UsuarioAtualizarEntrada): Promise<Usuario | null> {
    const usuario = await this.buscarPorId(dados.id)
    if (!usuario) return null
    if (dados.nome !== undefined) usuario.nome = dados.nome
    if (dados.login !== undefined) usuario.login = dados.login
    if (dados.perfil !== undefined) usuario.perfil = dados.perfil
    if (dados.ativo !== undefined) usuario.ativo = dados.ativo
    return { ...usuario }
  }

  async atualizarSenha(id: number, senhaHash: string): Promise<boolean> {
    const usuario = await this.buscarPorId(id)
    if (!usuario) return false
    usuario.senhaHash = senhaHash
    usuario.atualizadoEm = '2026-11-25T13:00:00.000Z'
    return true
  }
}

/** Hash determinístico apenas para o teste de regra; o scrypt real é testado à parte. */
const senhasFalsas: ServicoSenhas = {
  gerarHash: async (senha) => `hash(${senha})`,
  conferir: async (senha, armazenado) => armazenado === `hash(${senha})`,
  validarPolitica: validarPoliticaSenha,
}

class RelogioFalso {
  agoraMs = 1_000

  agora(): number {
    return this.agoraMs
  }
}

function autenticacao(
  repositorio: RepositorioUsuariosFalso,
  relogio: RelogioFalso,
  duracaoSessaoMs?: number | null,
): AutenticacaoServico {
  return new AutenticacaoServico(repositorio, senhasFalsas, relogio, { duracaoSessaoMs })
}

describe('AutenticacaoServico — bootstrap e sessão', () => {
  it('só faz bootstrap com zero usuários e nunca devolve senha/hash', async () => {
    const repositorio = new RepositorioUsuariosFalso()
    const relogio = new RelogioFalso()
    const primeiro = new AutenticacaoServico(repositorio, senhasFalsas, relogio)

    expect(await primeiro.sessaoAtual()).toEqual({ estado: 'bootstrap' })
    const sessao = await primeiro.bootstrap({
      nome: 'Ana',
      login: 'admin',
      senha: 'SenhaForte2026',
    })

    expect(sessao.perfil).toBe('Administrador')
    expect(sessao.login).toBe('admin')
    expect(sessao).not.toHaveProperty('senhaHash')
    expect(sessao).not.toHaveProperty('senha')
    expect(repositorio.usuarios[0]?.senhaHash).toBe('hash(SenhaForte2026)')
    expect(await primeiro.sessaoAtual()).toEqual({ estado: 'autenticada', sessao })

    await expect(
      primeiro.bootstrap({ nome: 'Outro', login: 'root', senha: 'OutraSenha2026' }),
    ).rejects.toMatchObject({ codigo: 'BOOTSTRAP_JA_REALIZADO' })
    expect(repositorio.usuarios).toHaveLength(1)
  })

  it('rejeita senha fraca no bootstrap antes de criar qualquer usuário', async () => {
    const repositorio = new RepositorioUsuariosFalso()
    const servico = autenticacao(repositorio, new RelogioFalso())

    await expect(
      servico.bootstrap({ nome: 'Ana', login: 'admin', senha: 'fraca' }),
    ).rejects.toMatchObject({ codigo: 'SENHA_FRACA' })
    expect(repositorio.usuarios).toHaveLength(0)
  })

  it('sair é idempotente e a sessão expira quando configurada', async () => {
    const repositorio = new RepositorioUsuariosFalso()
    const relogio = new RelogioFalso()
    const servico = autenticacao(repositorio, relogio, 1_000)
    await servico.bootstrap({ nome: 'Ana', login: 'admin', senha: 'SenhaForte2026' })

    expect(servico.sessao()).not.toBeNull()
    relogio.agoraMs += 1_000
    expect(servico.sessao()).toBeNull()
    await servico.sair()
    await servico.sair()
    expect(servico.sessao()).toBeNull()
  })
})

describe('AutenticacaoServico — entrada e bloqueio', () => {
  function comUsuario(): {
    repositorio: RepositorioUsuariosFalso
    relogio: RelogioFalso
    servico: AutenticacaoServico
  } {
    const repositorio = new RepositorioUsuariosFalso([
      {
        id: 1,
        nome: 'Ana',
        login: 'ana',
        senhaHash: 'hash(SenhaForte2026)',
        perfil: 'Administrador',
        ativo: true,
        atualizadoEm: AUDITORIA,
      },
    ])
    const relogio = new RelogioFalso()
    return { repositorio, relogio, servico: autenticacao(repositorio, relogio) }
  }

  it('aceita senha correta, rejeita a incorreta com mensagem genérica e normaliza login', async () => {
    const { servico } = comUsuario()

    await expect(
      servico.entrar({ login: 'ana', senha: 'SenhaErrada2026' }),
    ).rejects.toMatchObject({
      codigo: 'CREDENCIAIS_INVALIDAS',
      mensagem: MENSAGEM_CREDENCIAIS_INVALIDAS,
    })
    const sessao = await servico.entrar({ login: '  ANA  ', senha: 'SenhaForte2026' })
    expect(sessao.usuarioId).toBe(1)
    expect(sessao).not.toHaveProperty('senhaHash')
  })

  it('bloqueia após 5 falhas por 1 minuto e libera sem sleep real', async () => {
    const { repositorio, relogio, servico } = comUsuario()

    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      await expect(
        servico.entrar({ login: 'ana', senha: 'Errada2026' }),
      ).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })
    }

    // Mesmo com a senha correta, o bloqueio devolve a mesma mensagem genérica.
    await expect(
      servico.entrar({ login: 'ana', senha: 'SenhaForte2026' }),
    ).rejects.toMatchObject({
      codigo: 'CREDENCIAIS_INVALIDAS',
      mensagem: MENSAGEM_CREDENCIAIS_INVALIDAS,
    })

    relogio.agoraMs += 59_999
    await expect(
      servico.entrar({ login: 'ana', senha: 'SenhaForte2026' }),
    ).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })

    relogio.agoraMs += 1
    const sessao = await servico.entrar({ login: 'ana', senha: 'SenhaForte2026' })
    expect(sessao.login).toBe('ana')
    expect(repositorio.usuarios).toHaveLength(1)
  })

  it('bloqueia por login: outro login não é afetado', async () => {
    const { repositorio, relogio } = comUsuario()
    repositorio.usuarios.push({
      id: 2,
      nome: 'Bia',
      login: 'bia',
      senhaHash: 'hash(SenhaForte2026)',
      perfil: 'Atendente',
      ativo: true,
      atualizadoEm: AUDITORIA,
    })
    const servico = autenticacao(repositorio, relogio)

    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      await expect(servico.entrar({ login: 'ana', senha: 'Errada2026' })).rejects.toThrow()
    }
    await expect(
      servico.entrar({ login: 'bia', senha: 'SenhaForte2026' }),
    ).resolves.toMatchObject({ login: 'bia' })
  })

  it('recusa usuário inativo com código próprio', async () => {
    const { repositorio, servico } = comUsuario()
    const usuario = repositorio.usuarios[0]
    if (usuario) usuario.ativo = false

    await expect(
      servico.entrar({ login: 'ana', senha: 'SenhaForte2026' }),
    ).rejects.toMatchObject({ codigo: 'USUARIO_INATIVO' })
  })

  it('devolve anonima quando há usuários e nenhuma sessão', async () => {
    const { servico } = comUsuario()
    await expect(servico.sessaoAtual()).resolves.toEqual({ estado: 'anonima' })
  })
})

describe('UsuarioServico', () => {
  function composicao(): {
    repositorio: RepositorioUsuariosFalso
    autenticacao: AutenticacaoServico
    servico: UsuarioServico
  } {
    const repositorio = new RepositorioUsuariosFalso([
      {
        id: 1,
        nome: 'Ana',
        login: 'ana',
        senhaHash: 'hash(SenhaForte2026)',
        perfil: 'Administrador',
        ativo: true,
        atualizadoEm: AUDITORIA,
      },
      {
        id: 2,
        nome: 'Bia',
        login: 'bia',
        senhaHash: 'hash(OutraSenha2026)',
        perfil: 'Atendente',
        ativo: true,
        atualizadoEm: AUDITORIA,
      },
    ])
    const relogio = new RelogioFalso()
    const auth = autenticacao(repositorio, relogio)
    return { repositorio, autenticacao: auth, servico: new UsuarioServico(repositorio, auth, senhasFalsas) }
  }

  it('lista usuários sem senhaHash', async () => {
    const { servico } = composicao()
    const lista = await servico.listar()

    expect(lista).toHaveLength(2)
    for (const usuario of lista) {
      expect(usuario).not.toHaveProperty('senhaHash')
      expect(usuario).not.toHaveProperty('senha')
    }
  })

  it('impede login duplicado na criação', async () => {
    const { servico } = composicao()

    await expect(
      servico.criar({ nome: 'Ana 2', login: 'ANA', senha: 'SenhaForte2026', perfil: 'Atendente' }),
    ).rejects.toMatchObject({ codigo: 'LOGIN_DUPLICADO' })
  })

  it('exige senha atual para alterar a própria senha e valida a nova', async () => {
    const { repositorio, autenticacao, servico } = composicao()
    await autenticacao.entrar({ login: 'ana', senha: 'SenhaForte2026' })

    await expect(
      servico.alterarSenha({ id: 1, senhaNova: 'NovaSenha2026' }),
    ).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })

    await expect(
      servico.alterarSenha({ id: 1, senhaAtual: 'Errada2026', senhaNova: 'NovaSenha2026' }),
    ).rejects.toMatchObject({ codigo: 'CREDENCIAIS_INVALIDAS' })

    await expect(
      servico.alterarSenha({ id: 1, senhaAtual: 'SenhaForte2026', senhaNova: 'fraca' }),
    ).rejects.toMatchObject({ codigo: 'SENHA_FRACA' })

    await servico.alterarSenha({
      id: 1,
      senhaAtual: 'SenhaForte2026',
      senhaNova: 'NovaSenha2026',
    })
    expect(repositorio.usuarios[0]?.senhaHash).toBe('hash(NovaSenha2026)')
    expect(repositorio.usuarios[0]?.atualizadoEm).toBe('2026-11-25T13:00:00.000Z')
  })

  it('permite administração redefinir senha de outro usuário sem senha atual', async () => {
    const { repositorio, servico } = composicao()

    await servico.alterarSenha({ id: 2, senhaNova: 'Redefinida2026' })
    expect(repositorio.usuarios[1]?.senhaHash).toBe('hash(Redefinida2026)')
  })

  it('atualiza parcialmente e reflete perfil na sessão ativa', async () => {
    const { autenticacao, servico } = composicao()
    await autenticacao.entrar({ login: 'ana', senha: 'SenhaForte2026' })

    const atualizado = await servico.atualizar({ id: 1, perfil: 'Atendente' })

    expect(atualizado.perfil).toBe('Atendente')
    expect('senhaHash' in atualizado).toBe(false)
    expect(autenticacao.sessao()).toMatchObject({ perfil: 'Atendente' })
  })
})

// ---------------------------------------------------------------------------
// ADR 0009 — auto-cadastro público e vínculo usuario → cliente
// ---------------------------------------------------------------------------

class RepositorioCadastroClienteFalso implements RepositorioCadastroCliente {
  readonly criacoes: DadosCadastroCliente[] = []
  readonly usuarios: Usuario[] = []
  readonly cpfs = new Set<string>()
  readonly vinculos = new Map<number, number>()
  administradoresAtivos = 1
  private proximoUsuarioId = 10
  private proximoClienteId = 20

  async contarAdministradoresAtivos(): Promise<number> {
    return this.administradoresAtivos
  }

  async cpfEmUso(cpf: string): Promise<boolean> {
    return this.cpfs.has(cpf)
  }

  async clienteIdPorUsuario(usuarioId: number): Promise<number | null> {
    return this.vinculos.get(usuarioId) ?? null
  }

  async criar(dados: DadosCadastroCliente): Promise<UsuarioEClienteCriados> {
    this.criacoes.push(dados)
    this.cpfs.add(dados.cpf)
    const usuario: Usuario = {
      id: this.proximoUsuarioId++,
      nome: dados.nome,
      login: dados.login,
      senhaHash: dados.senhaHash,
      perfil: 'Cliente',
      ativo: true,
      atualizadoEm: AUDITORIA,
    }
    const cliente: Cliente = {
      id: this.proximoClienteId++,
      nome: dados.nome,
      cpf: dados.cpf,
      telefone: dados.telefone ?? null,
      email: dados.email ?? null,
      cep: dados.cep ?? null,
      logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null,
      complemento: dados.complemento ?? null,
      bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null,
      uf: dados.uf ?? null,
      ativo: true,
      atualizadoEm: AUDITORIA,
    }
    this.vinculos.set(usuario.id, cliente.id)
    this.usuarios.push(usuario)
    return { usuario, cliente }
  }
}

const CADASTRO_VALIDO: CadastrarClienteEntrada = {
  nome: 'Carla',
  cpf: '529.982.247-25',
  login: 'carla',
  senha: 'SenhaForte2026',
}

function composicaoCadastro(): {
  usuarios: RepositorioUsuariosFalso
  cadastro: RepositorioCadastroClienteFalso
  relogio: RelogioFalso
  servico: AutenticacaoServico
} {
  const usuarios = new RepositorioUsuariosFalso()
  const cadastro = new RepositorioCadastroClienteFalso()
  const relogio = new RelogioFalso()
  return {
    usuarios,
    cadastro,
    relogio,
    servico: new AutenticacaoServico(usuarios, senhasFalsas, relogio, {}, cadastro),
  }
}

describe('AutenticacaoServico — auto-cadastro de Cliente (ADR 0009)', () => {
  it('recusa perfil forjado antes de criar qualquer registro', async () => {
    const { cadastro, servico } = composicaoCadastro()
    const forjado = { ...CADASTRO_VALIDO, perfil: 'Administrador' } as unknown as CadastrarClienteEntrada

    await expect(servico.cadastrarCliente(forjado)).rejects.toMatchObject({
      codigo: 'PERFIL_INVALIDO',
    })
    expect(cadastro.criacoes).toHaveLength(0)
  })

  it('exige administrador ativo antes de permitir o auto-cadastro', async () => {
    const { cadastro, servico } = composicaoCadastro()
    cadastro.administradoresAtivos = 0

    await expect(servico.cadastrarCliente(CADASTRO_VALIDO)).rejects.toMatchObject({
      codigo: 'BOOTSTRAP_PENDENTE',
    })
    expect(cadastro.criacoes).toHaveLength(0)
  })

  it('normaliza CPF, cria usuario+cliente e devolve sessão com clienteId', async () => {
    const { usuarios, cadastro, servico } = composicaoCadastro()

    const sessao = await servico.cadastrarCliente(CADASTRO_VALIDO)

    expect(sessao).toMatchObject({ perfil: 'Cliente', login: 'carla', clienteId: 20 })
    expect(sessao).not.toHaveProperty('senha')
    expect(sessao).not.toHaveProperty('senhaHash')
    expect(cadastro.criacoes[0]?.cpf).toBe('52998224725')
    expect(Object.prototype.hasOwnProperty.call(cadastro.criacoes[0] ?? {}, 'perfil')).toBe(false)
    expect(servico.sessao()).toEqual(sessao)

    // Entrar depois também resolve o vínculo a partir do banco, não do payload.
    usuarios.usuarios.push(...cadastro.usuarios)
    const reentrada = await servico.entrar({ login: 'CARLA', senha: 'SenhaForte2026' })
    expect(reentrada.clienteId).toBe(20)
  })

  it('rejeita CPF repetido em outra formatação sem revelar titular', async () => {
    const { cadastro, servico } = composicaoCadastro()
    await servico.cadastrarCliente(CADASTRO_VALIDO)

    await expect(
      servico.cadastrarCliente({ ...CADASTRO_VALIDO, cpf: '52998224725', login: 'outra' }),
    ).rejects.toMatchObject({ codigo: 'CPF_DUPLICADO', mensagem: 'CPF já cadastrado.' })
    expect(cadastro.criacoes).toHaveLength(1)
  })

  it('bloqueia por CPF normalizado após 5 falhas e libera após 1 minuto', async () => {
    const { cadastro, relogio, servico } = composicaoCadastro()
    await servico.cadastrarCliente(CADASTRO_VALIDO)

    const repetido: CadastrarClienteEntrada = {
      ...CADASTRO_VALIDO,
      cpf: '52998224725',
      login: 'outro',
    }
    for (let tentativa = 0; tentativa < 5; tentativa += 1) {
      await expect(servico.cadastrarCliente(repetido)).rejects.toMatchObject({
        codigo: 'CPF_DUPLICADO',
      })
    }
    await expect(servico.cadastrarCliente(repetido)).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
      mensagem: MENSAGEM_CADASTRO_INDISPONIVEL,
    })

    relogio.agoraMs += 60_000
    await expect(servico.cadastrarCliente(repetido)).rejects.toMatchObject({
      codigo: 'CPF_DUPLICADO',
    })
    expect(cadastro.criacoes).toHaveLength(1)
  })

  it('usa mensagem genérica quando o login já existe', async () => {
    const { usuarios, servico } = composicaoCadastro()
    usuarios.usuarios.push({
      id: 1,
      nome: 'Ana',
      login: 'carla',
      senhaHash: 'hash(SenhaForte2026)',
      perfil: 'Administrador',
      ativo: true,
      atualizadoEm: AUDITORIA,
    })

    await expect(servico.cadastrarCliente(CADASTRO_VALIDO)).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
      mensagem: MENSAGEM_CADASTRO_INDISPONIVEL,
    })
  })

  it('valida senha e dígitos do CPF antes de tocar no repositório', async () => {
    const { cadastro, servico } = composicaoCadastro()

    await expect(
      servico.cadastrarCliente({ ...CADASTRO_VALIDO, senha: 'fraca' }),
    ).rejects.toMatchObject({ codigo: 'SENHA_FRACA' })
    await expect(
      servico.cadastrarCliente({ ...CADASTRO_VALIDO, cpf: '11111111111' }),
    ).rejects.toMatchObject({ codigo: 'DADOS_INVALIDOS' })
    expect(cadastro.criacoes).toHaveLength(0)
  })
})
