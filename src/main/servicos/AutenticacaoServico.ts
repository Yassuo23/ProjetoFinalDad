import { cpfValido, normalizarCpf } from '../../shared/contratos/esquemas'
import type {
  CadastrarClienteEntrada,
  EstadoSessao,
  Sessao,
  Usuario,
} from '../../shared/contratos/modelos'
import type {
  RepositorioCadastroCliente,
  RepositorioUsuarios,
  UsuarioEClienteCriados,
} from '../repositorios/portas'
import { ErroDeDominio } from './ErroDeDominio'
import type { ServicoAutenticacao, ServicoSenhas } from './portas'
import { gerarHash, conferirSenha, validarPoliticaSenha } from './SenhaHash'

/** Relógio injetável: testes de bloqueio avançam o tempo sem `sleep`. */
export interface Relogio {
  agora(): number
}

export const LIMIAR_TENTATIVAS = 5
export const DURACAO_BLOQUEIO_MS = 60_000
/** Expiração opcional da sessão; `null` nas opções desativa a expiração. */
export const DURACAO_SESSAO_PADRAO_MS = 8 * 60 * 60 * 1000

/** Texto fixo: nunca dizer se o login existe, se a senha falhou ou se há bloqueio. */
export const MENSAGEM_CREDENCIAIS_INVALIDAS = 'usuário ou senha inválidos'

/** Cadastro público: o mesmo texto para login em uso, bloqueio e erro de gravação. */
export const MENSAGEM_CADASTRO_INDISPONIVEL = 'Cadastro indisponível no momento.'

const servicoSenhasPadrao: ServicoSenhas = {
  gerarHash,
  conferir: conferirSenha,
  validarPolitica: validarPoliticaSenha,
}

interface RegistroTentativas {
  falhas: number
  /** `0` = sem bloqueio; caso contrário, epoch ms de fim do bloqueio. */
  bloqueadoAte: number
}

interface OpcoesAutenticacao {
  /** `null` = sessão sem expiração (documentado em docs/seguranca.md). */
  readonly duracaoSessaoMs?: number | null
}

function normalizarLogin(login: string): string {
  return login.trim().toLowerCase()
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

/**
 * Autenticação e sessão — tudo em memória no processo principal.
 *
 * Bloqueio: 5 falhas por login normalizado (minúsculas/sem espaços) geram 1 minuto
 * de bloqueio. O IPC não fornece um IP confiável do balcão (Electron local), então
 * a chave é o login; a mensagem de erro é idêntica em todos os casos.
 */
export class AutenticacaoServico implements ServicoAutenticacao {
  private sessaoAtiva: { sessao: Sessao; expiraEm: number | null } | null = null
  private readonly tentativas = new Map<string, RegistroTentativas>()
  private readonly duracaoSessaoMs: number | null
  private fila: Promise<unknown> = Promise.resolve()
  private cadastroClientes: RepositorioCadastroCliente | null = null

  constructor(
    private readonly usuarios: RepositorioUsuarios,
    private readonly senhas: ServicoSenhas = servicoSenhasPadrao,
    private readonly relogio: Relogio = { agora: () => Date.now() },
    opcoes: OpcoesAutenticacao = {},
    cadastroClientes?: RepositorioCadastroCliente,
  ) {
    this.duracaoSessaoMs =
      opcoes.duracaoSessaoMs === undefined ? DURACAO_SESSAO_PADRAO_MS : opcoes.duracaoSessaoMs
    this.cadastroClientes = cadastroClientes ?? null
  }

  /**
   * A composição de `src/main/index.ts` permanece intacta: o repositório de
   * cadastro é injetado na composição dos handlers, antes do primeiro invoke.
   */
  definirRepositorioCadastro(repositorio: RepositorioCadastroCliente): void {
    this.cadastroClientes = repositorio
  }

  /** Visão síncrona usada pela guarda de perfil do RegistroIpc. */
  sessao(): Sessao | null {
    const atual = this.sessaoAtiva
    if (!atual) return null
    if (atual.expiraEm !== null && this.relogio.agora() >= atual.expiraEm) {
      this.sessaoAtiva = null
      return null
    }
    return atual.sessao
  }

  async sessaoAtual(): Promise<EstadoSessao> {
    const ativa = this.sessao()
    if (ativa) return { estado: 'autenticada', sessao: ativa }
    if ((await this.usuarios.contar()) === 0) return { estado: 'bootstrap' }
    return { estado: 'anonima' }
  }

  async entrar(dados: { readonly login: string; readonly senha: string }): Promise<Sessao> {
    const chave = normalizarLogin(dados.login)
    const agora = this.relogio.agora()
    this.limparBloqueioExpirado(chave, agora)
    if (this.estaBloqueado(chave, agora)) {
      throw this.credenciaisInvalidas()
    }

    const usuario = await this.usuarios.buscarPorLogin(chave)
    if (!usuario || !(await this.senhas.conferir(dados.senha, usuario.senhaHash))) {
      this.registrarFalha(chave, agora)
      throw this.credenciaisInvalidas()
    }
    if (!usuario.ativo) {
      throw new ErroDeDominio(
        'USUARIO_INATIVO',
        'Usuário inativo. Procure o administrador para reativar o acesso.',
      )
    }

    const clienteId = await this.clienteIdDaSessao(usuario)
    this.tentativas.delete(chave)
    this.abrirSessao(usuario, clienteId)
    return this.sessaoAtiva?.sessao ?? paraSessao(usuario, clienteId)
  }

  async sair(): Promise<void> {
    this.sessaoAtiva = null
  }

  /** Primeira execução: exige zero usuários e uma senha escolhida na chamada. */
  async bootstrap(dados: {
    readonly nome: string
    readonly login: string
    readonly senha: string
  }): Promise<Sessao> {
    this.senhas.validarPolitica(dados.senha)
    return this.exclusivo(async () => {
      if ((await this.usuarios.contar()) > 0) {
        throw new ErroDeDominio(
          'BOOTSTRAP_JA_REALIZADO',
          'O primeiro administrador já foi cadastrado.',
        )
      }
      const usuario = await this.usuarios.criar({
        nome: dados.nome,
        login: normalizarLogin(dados.login),
        senhaHash: await this.senhas.gerarHash(dados.senha),
        perfil: 'Administrador',
      })
      this.tentativas.delete(normalizarLogin(dados.login))
      this.abrirSessao(usuario)
      return this.sessaoAtiva?.sessao ?? paraSessao(usuario)
    })
  }

  /**
   * ADR 0009: auto-cadastro público. Nenhum `perfil` é aceito — o literal
   * `Cliente` é fixado no repositório. O CPF normalizado é a chave do limite de
   * tentativas, e a pré-condição de administrador ativo impede um app órfão.
   */
  async cadastrarCliente(dados: CadastrarClienteEntrada): Promise<Sessao> {
    const bruto: Record<string, unknown> = { ...dados }
    if (Object.prototype.hasOwnProperty.call(bruto, 'perfil')) {
      throw new ErroDeDominio('PERFIL_INVALIDO', 'Perfil não pode ser informado no cadastro.')
    }

    this.senhas.validarPolitica(dados.senha)
    const cpf = normalizarCpf(dados.cpf)
    if (!cpfValido(dados.cpf)) {
      throw new ErroDeDominio('DADOS_INVALIDOS', 'CPF inválido.')
    }

    const login = normalizarLogin(dados.login)
    const chave = `cpf:${cpf}`
    const agora = this.relogio.agora()
    this.limparBloqueioExpirado(chave, agora)
    if (this.estaBloqueado(chave, agora)) {
      throw new ErroDeDominio('DADOS_INVALIDOS', MENSAGEM_CADASTRO_INDISPONIVEL)
    }

    return this.exclusivo(async () => {
      const repositorio = this.cadastroClientes
      if (!repositorio) {
        throw new ErroDeDominio('DADOS_INVALIDOS', MENSAGEM_CADASTRO_INDISPONIVEL)
      }

      if ((await repositorio.contarAdministradoresAtivos()) === 0) {
        this.registrarFalha(chave, this.relogio.agora())
        throw new ErroDeDominio(
          'BOOTSTRAP_PENDENTE',
          'Conclua a primeira execução antes de cadastrar clientes.',
        )
      }
      if (await repositorio.cpfEmUso(cpf)) {
        this.registrarFalha(chave, this.relogio.agora())
        throw new ErroDeDominio('CPF_DUPLICADO', 'CPF já cadastrado.')
      }
      if (await this.usuarios.loginEmUso(login)) {
        this.registrarFalha(chave, this.relogio.agora())
        throw new ErroDeDominio('DADOS_INVALIDOS', MENSAGEM_CADASTRO_INDISPONIVEL)
      }

      let criados: UsuarioEClienteCriados
      try {
        criados = await repositorio.criar({
          nome: dados.nome,
          cpf,
          login,
          senhaHash: await this.senhas.gerarHash(dados.senha),
          telefone: dados.telefone ?? null,
          email: dados.email ?? null,
          cep: dados.cep ?? null,
          logradouro: dados.logradouro ?? null,
          numero: dados.numero ?? null,
          complemento: dados.complemento ?? null,
          bairro: dados.bairro ?? null,
          cidade: dados.cidade ?? null,
          uf: dados.uf ?? null,
        })
      } catch {
        // Colisão de unique (CPF/login), falha da transação ou do driver não
        // deve virar oráculo: mesma mensagem de sempre.
        this.registrarFalha(chave, this.relogio.agora())
        throw new ErroDeDominio('DADOS_INVALIDOS', MENSAGEM_CADASTRO_INDISPONIVEL)
      }

      this.tentativas.delete(chave)
      this.abrirSessao(criados.usuario, criados.cliente.id)
      return this.sessaoAtiva?.sessao ?? paraSessao(criados.usuario, criados.cliente.id)
    })
  }

  /** Chamado pelo serviço de usuários após criar/atualizar algo da própria sessão. */
  atualizarSessao(sessao: Sessao | null): void {
    if (!sessao) {
      this.sessaoAtiva = null
      return
    }
    this.sessaoAtiva = {
      sessao,
      expiraEm:
        this.duracaoSessaoMs === null ? null : this.relogio.agora() + this.duracaoSessaoMs,
    }
  }

  private abrirSessao(usuario: Usuario, clienteId: number | null = null): void {
    this.atualizarSessao(paraSessao(usuario, clienteId))
  }

  /** Cliente sem vínculo não entra: fail-closed, sem confiar no payload. */
  private async clienteIdDaSessao(usuario: Usuario): Promise<number | null> {
    if (usuario.perfil !== 'Cliente') return null
    const repositorio = this.cadastroClientes
    if (repositorio === null) {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Conta de cliente sem vínculo ativo.')
    }
    const clienteId = await repositorio.clienteIdPorUsuario(usuario.id)
    if (clienteId === null) {
      throw new ErroDeDominio('SEM_PERMISSAO', 'Conta de cliente sem vínculo ativo.')
    }
    return clienteId
  }

  private credenciaisInvalidas(): ErroDeDominio {
    return new ErroDeDominio('CREDENCIAIS_INVALIDAS', MENSAGEM_CREDENCIAIS_INVALIDAS)
  }

  private limparBloqueioExpirado(chave: string, agora: number): void {
    const atual = this.tentativas.get(chave)
    if (atual && atual.bloqueadoAte !== 0 && atual.bloqueadoAte <= agora) {
      this.tentativas.delete(chave)
    }
  }

  private estaBloqueado(chave: string, agora: number): boolean {
    const atual = this.tentativas.get(chave)
    return atual !== undefined && atual.bloqueadoAte > agora
  }

  private registrarFalha(chave: string, agora: number): void {
    const atual = this.tentativas.get(chave) ?? { falhas: 0, bloqueadoAte: 0 }
    atual.falhas += 1
    if (atual.falhas >= LIMIAR_TENTATIVAS) {
      atual.falhas = 0
      atual.bloqueadoAte = agora + DURACAO_BLOQUEIO_MS
    }
    this.tentativas.set(chave, atual)
  }

  /** Serializa bootstrap para duas chamadas concorrentes não criarem dois admins. */
  private exclusivo<T>(fn: () => Promise<T>): Promise<T> {
    const resultado = this.fila.then(fn, fn)
    this.fila = resultado.then(
      () => undefined,
      () => undefined,
    )
    return resultado
  }
}
