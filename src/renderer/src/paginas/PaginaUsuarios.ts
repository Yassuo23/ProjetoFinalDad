import type { PerfilUsuario, UsuarioPublico } from '../../../shared/contratos/modelos'
import {
  AreaToast,
  Badge,
  Botao,
  Campo,
  Carregando,
  EstadoErro,
  EstadoVazio,
  Modal,
  PainelFormulario,
  Select,
  Tabela,
} from '../componentes'
import type { ColunaTabela } from '../componentes'
import {
  Componente,
  criarElemento,
  ehAdministrador,
  observarPerfil,
  registrarAtalhos,
  sessaoAtiva,
  substituirConteudo,
} from '../nucleo'
import {
  ServicoUsuarios,
  TEXTO_POLITICA_LOGIN,
  TEXTO_POLITICA_SENHA,
  loginValido,
  motivoErroAutenticacao,
  nomeValido,
  senhaValida,
} from '../servicos'
import { formatadorPtBr } from '../util'

/** DS 8.14 + wireframe 8.5 — classes literais, sem interpolação e sem CSS próprio. */
const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-[1fr]',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeCampos: 'grid grid-cols-1 gap-4',
  ajuda: 'text-xs text-floresta/70',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  acao: 'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'
const ICONE_USUARIO = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 1 0 16 0'
const ICONE_SENHA = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'

/** `perfilUsuarioStaff` no main: Cliente nunca é criado por esta tela. */
const PERFIS_STAFF: readonly PerfilUsuario[] = ['Administrador', 'Atendente']

type Modo = 'novo' | 'editar' | 'senha'

interface FormularioUsuario {
  nome: string
  login: string
  perfil: string
  senha: string
  confirmarSenha: string
  senhaAtual: string
}

interface CamposUsuario {
  nome?: Campo
  login?: Campo
  perfil?: Select
  senha?: Campo
  confirmarSenha?: Campo
  senhaAtual?: Campo
}

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

function formularioVazio(): FormularioUsuario {
  return { nome: '', login: '', perfil: 'Atendente', senha: '', confirmarSenha: '', senhaAtual: '' }
}

function formularioDe(usuario: UsuarioPublico): FormularioUsuario {
  return {
    nome: usuario.nome,
    login: usuario.login,
    perfil: usuario.perfil === 'Administrador' ? 'Administrador' : 'Atendente',
    senha: '',
    confirmarSenha: '',
    senhaAtual: '',
  }
}

function perfilStaff(valor: string): PerfilUsuario | null {
  return PERFIS_STAFF.find((perfil) => perfil === valor) ?? null
}

function rotuloPerfil(perfil: PerfilUsuario): string {
  return perfil === 'Administrador' ? 'Administrador' : 'Atendente de balcão'
}

function mensagemErro(erro: unknown): string {
  switch (motivoErroAutenticacao(erro)) {
    case 'credenciais':
      return 'A senha atual está incorreta.'
    case 'loginDuplicado':
      return 'Este usuário já existe. Escolha outro login.'
    case 'senhaFraca':
      return TEXTO_POLITICA_SENHA
    case 'perfilInvalido':
      return 'Escolha um perfil válido.'
    case 'semAcesso':
      return 'Sua sessão não permite esta ação. Entre novamente.'
    default:
      return 'Não foi possível salvar. Verifique os dados e tente novamente.'
  }
}

const COLUNAS: readonly ColunaTabela<UsuarioPublico>[] = [
  { chave: 'nome', rotulo: 'Nome', ordenavel: true },
  { chave: 'login', rotulo: 'Usuário', ordenavel: true },
  {
    chave: 'perfil',
    rotulo: 'Perfil',
    celula: (linha) => new Badge({ texto: rotuloPerfil(linha.perfil), tom: 'neutro' }).raiz,
  },
  {
    chave: 'ativo',
    rotulo: 'Situação',
    celula: (linha) =>
      new Badge({
        texto: linha.ativo ? 'Ativo' : 'Inativo',
        tom: linha.ativo ? 'sucesso' : 'neutro',
      }).raiz,
  },
  {
    chave: 'atualizadoEm',
    rotulo: 'Atualizado em',
    celula: (linha) => formatadorPtBr.data(linha.atualizadoEm),
  },
]

export class PaginaUsuarios extends Componente {
  private readonly servico = new ServicoUsuarios()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void
  private registros: readonly UsuarioPublico[] = []
  private selecionado: UsuarioPublico | null = null
  private modo: Modo = 'novo'
  private editandoId: number | null = null
  private formulario: FormularioUsuario = formularioVazio()
  private campos: CamposUsuario = {}
  private painel: PainelFormulario | null = null
  private areaLista: HTMLElement | null = null
  private campoBusca: Campo | null = null
  private modal: Modal | null = null
  private busca = ''
  private carregando = true
  private falhaLista: string | null = null
  private salvando = false

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))

    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => this.novo(),
      aoBuscar: () => this.campoBusca?.focar(),
      aoRecarregar: () => {
        void this.recarregar()
      },
      aoEditar: () => this.editarSelecionado(),
      aoConfirmar: () => {
        void this.salvar()
      },
      aoCancelar: () => this.cancelarEdicao(),
      emCampo: () => false,
      modalAberto: () => this.modal !== null,
    })
    this.cancelarPerfil = observarPerfil(() => {
      this.montarEstrutura()
    })
  }

  protected aoMontar(): void {
    this.toasts.montarFilho(document.body)
    this.montarEstrutura()
    if (ehAdministrador()) {
      void this.recarregar()
    }
  }

  protected aoDesmontar(): void {
    this.cancelarAtalhos()
    this.cancelarPerfil()
    this.modal?.fechar()
    this.modal = null
    this.toasts.destruir()
  }

  private async recarregar(): Promise<void> {
    if (!ehAdministrador()) {
      return
    }
    this.carregando = true
    this.falhaLista = null
    this.montarEstrutura()

    try {
      this.registros = await this.servico.listar({ incluirInativos: true })
    } catch {
      this.falhaLista = 'Não foi possível carregar os usuários. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: this.falhaLista,
        tom: 'erro',
      })
    } finally {
      this.carregando = false
      if (this.selecionado !== null) {
        const atual = this.registros.find((item) => item.id === this.selecionado?.id)
        this.selecionado = atual ?? null
        if (atual !== undefined) {
          this.formulario = formularioDe(atual)
        } else {
          this.cancelarEdicao()
        }
      }
      this.montarEstrutura()
    }
  }

  private montarEstrutura(): void {
    if (!ehAdministrador()) {
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'pessoas',
        titulo: 'Área administrativa',
        mensagem: 'Somente o administrador pode consultar e gerenciar usuários.',
        acao: {
          texto: 'Voltar ao Dashboard',
          aoClicar: () => {
            window.location.hash = '#/dashboard'
          },
        },
      }).montar(area)
      substituirConteudo(this.elemento, area)
      return
    }

    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Usuários' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Quem pode entrar e o que cada um pode fazer.',
            }),
          ],
        }),
        new Botao({ texto: 'Novo usuário', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.campoBusca = new Campo({
      id: 'usuarios-busca',
      rotulo: 'Buscar usuário',
      placeholder: 'Nome, usuário ou perfil',
      icone: ICONE_BUSCA,
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarTabela()
      },
    })

    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [this.campoBusca.raiz],
    })

    const areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.areaLista = areaTabela
    this.preencherLista(areaTabela)

    const areaPainel = criarElemento('div', { className: CLASSES.coluna })
    this.preencherPainel(areaPainel)

    substituirConteudo(
      this.elemento,
      criarElemento('div', {
        className: 'flex h-full min-h-0 flex-col gap-6',
        filhos: [
          cabecalho,
          filtros,
          criarElemento('div', {
            className: CLASSES.conteudoComPainel,
            filhos: [areaTabela, areaPainel],
          }),
        ],
      }),
    )
  }

  private preencherLista(area: HTMLElement): void {
    area.replaceChildren()
    if (this.carregando) {
      area.append(new Carregando({ mensagem: 'Carregando usuários…' }).raiz)
      return
    }
    if (this.falhaLista !== null) {
      new EstadoErro({
        titulo: 'Não foi possível carregar os usuários',
        mensagem: this.falhaLista,
        aoTentar: () => {
          void this.recarregar()
        },
      }).montar(area)
      return
    }

    const tabela = new Tabela<UsuarioPublico>({
      colunas: [
        ...COLUNAS,
        {
          chave: 'atualizadoEm',
          rotulo: 'Ações',
          celula: (linha) => this.acoes(linha),
        },
      ],
      linhas: this.filtrar(),
      mensagemVazia: 'Nenhum usuário encontrado.',
      aoSelecionar: (linha) => this.selecionar(linha),
      linhaSelecionada: (linha) => this.selecionado?.id === linha.id,
    })
    const scroll = criarElemento('div', { className: CLASSES.tabelaScroll })
    tabela.montar(scroll)
    area.append(scroll)
  }

  private preencherPainel(area: HTMLElement): void {
    const corpo = criarElemento('div', { className: CLASSES.gradeCampos })
    const campos: CamposUsuario = {}

    if (this.modo !== 'senha') {
      campos.nome = new Campo({
        id: 'usuarios-nome',
        rotulo: 'Nome completo',
        nome: 'nome',
        valorInicial: this.formulario.nome,
        autocomplete: 'name',
        obrigatorio: true,
        icone: ICONE_USUARIO,
        aoAlterar: (valor) => {
          this.formulario.nome = valor
        },
      })
      campos.login = new Campo({
        id: 'usuarios-login',
        rotulo: 'Usuário ou CPF',
        nome: 'login',
        valorInicial: this.formulario.login,
        autocomplete: 'username',
        obrigatorio: true,
        ajuda: TEXTO_POLITICA_LOGIN,
        aoAlterar: (valor) => {
          this.formulario.login = valor
        },
      })
      campos.perfil = new Select({
        id: 'usuarios-perfil',
        rotulo: 'Perfil',
        opcoes: PERFIS_STAFF.map((perfil) => ({ valor: perfil, rotulo: rotuloPerfil(perfil) })),
        valorInicial: this.formulario.perfil,
        aoAlterar: (valor) => {
          this.formulario.perfil = valor
        },
      })
    }

    if (this.modo === 'novo') {
      campos.senha = new Campo({
        id: 'usuarios-senha',
        rotulo: 'Senha inicial',
        tipo: 'password',
        nome: 'senha',
        autocomplete: 'new-password',
        obrigatorio: true,
        icone: ICONE_SENHA,
        ajuda: TEXTO_POLITICA_SENHA,
        aoAlterar: (valor) => {
          this.formulario.senha = valor
        },
      })
      campos.confirmarSenha = new Campo({
        id: 'usuarios-confirmar-senha',
        rotulo: 'Repetir senha',
        tipo: 'password',
        nome: 'confirmarSenha',
        autocomplete: 'new-password',
        obrigatorio: true,
        icone: ICONE_SENHA,
        aoAlterar: (valor) => {
          this.formulario.confirmarSenha = valor
        },
      })
    } else if (this.modo === 'senha') {
      campos.senha = new Campo({
        id: 'usuarios-senha-nova',
        rotulo: 'Nova senha',
        tipo: 'password',
        nome: 'senhaNova',
        autocomplete: 'new-password',
        obrigatorio: true,
        icone: ICONE_SENHA,
        ajuda: TEXTO_POLITICA_SENHA,
        aoAlterar: (valor) => {
          this.formulario.senha = valor
        },
      })
      campos.confirmarSenha = new Campo({
        id: 'usuarios-confirmar-senha-nova',
        rotulo: 'Repetir nova senha',
        tipo: 'password',
        nome: 'confirmarSenha',
        autocomplete: 'new-password',
        obrigatorio: true,
        icone: ICONE_SENHA,
        aoAlterar: (valor) => {
          this.formulario.confirmarSenha = valor
        },
      })
      if (this.selecionado?.id === sessaoAtiva()?.usuarioId) {
        campos.senhaAtual = new Campo({
          id: 'usuarios-senha-atual',
          rotulo: 'Senha atual',
          tipo: 'password',
          nome: 'senhaAtual',
          autocomplete: 'current-password',
          obrigatorio: true,
          icone: ICONE_SENHA,
          aoAlterar: (valor) => {
            this.formulario.senhaAtual = valor
          },
        })
      }
    }

    for (const campo of [
      campos.nome,
      campos.login,
      campos.perfil,
      campos.senha,
      campos.confirmarSenha,
      campos.senhaAtual,
    ]) {
      if (campo !== undefined) {
        corpo.append(campo.raiz)
      }
    }

    const selecionado = this.selecionado
    const titulo =
      this.modo === 'novo'
        ? 'Novo usuário'
        : this.modo === 'senha'
          ? `Trocar senha de ${this.selecionado?.nome ?? 'usuário'}`
          : `Editar ${this.selecionado?.nome ?? 'usuário'}`

    const rodape: Node[] = [
      new Botao({
        texto: 'Cancelar',
        variante: 'secundario',
        aoClicar: () => this.cancelarEdicao(),
      }).raiz,
      new Botao({ texto: 'Salvar', aoClicar: () => void this.salvar() }).raiz,
    ]

    this.campos = campos
    this.painel = new PainelFormulario({
      id: 'usuarios-formulario',
      titulo,
      corpo,
      rodape,
      acoesCabecalho:
        this.modo === 'editar' && selecionado !== null
          ? [
              new Botao({
                texto: 'Trocar senha',
                variante: 'ghost',
                aoClicar: () => {
                  this.trocarSenha(selecionado)
                },
              }).raiz,
            ]
          : [],
      carregando: this.salvando,
      desabilitado: this.salvando,
      mensagemCarregando: 'Salvando…',
    })
    area.replaceChildren(this.painel.raiz)

    corpo.addEventListener('keydown', (evento) => {
      if (evento.key === 'Enter' && evento.target instanceof HTMLInputElement) {
        evento.preventDefault()
        void this.salvar()
      }
    })
  }

  private atualizarTabela(): void {
    if (this.carregando || this.falhaLista !== null || this.areaLista === null) {
      return
    }
    this.preencherLista(this.areaLista)
  }

  private filtrar(): readonly UsuarioPublico[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    if (termo === '') {
      return this.registros
    }
    return this.registros.filter((usuario) =>
      [usuario.nome, usuario.login, rotuloPerfil(usuario.perfil)].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      ),
    )
  }

  private selecionar(usuario: UsuarioPublico): void {
    this.selecionado = usuario
    this.editandoId = usuario.id
    this.modo = 'editar'
    this.formulario = formularioDe(usuario)
    this.montarEstrutura()
    this.painel?.focarPrimeiroControle()
  }

  private editarSelecionado(): void {
    if (this.selecionado !== null) {
      this.selecionar(this.selecionado)
    }
  }

  private novo(): void {
    this.selecionado = null
    this.editandoId = null
    this.modo = 'novo'
    this.formulario = formularioVazio()
    this.montarEstrutura()
    this.painel?.focarPrimeiroControle()
  }

  private trocarSenha(usuario: UsuarioPublico): void {
    this.selecionado = usuario
    this.editandoId = usuario.id
    this.modo = 'senha'
    this.formulario = { ...formularioDe(usuario), senha: '', confirmarSenha: '', senhaAtual: '' }
    this.montarEstrutura()
    this.painel?.focarPrimeiroControle()
  }

  private cancelarEdicao(): void {
    this.selecionado = null
    this.editandoId = null
    this.modo = 'novo'
    this.formulario = formularioVazio()
    this.montarEstrutura()
  }

  private validar(): string | null {
    if (this.modo === 'senha') {
      if (!senhaValida(this.formulario.senha)) {
        this.campos.senha?.focar()
        return TEXTO_POLITICA_SENHA
      }
      if (this.formulario.senha !== this.formulario.confirmarSenha) {
        this.campos.confirmarSenha?.focar()
        return 'As senhas não conferem.'
      }
      if (
        this.selecionado?.id === sessaoAtiva()?.usuarioId &&
        this.formulario.senhaAtual.length === 0
      ) {
        this.campos.senhaAtual?.focar()
        return 'Informe sua senha atual.'
      }
      return null
    }

    if (!nomeValido(this.formulario.nome.trim())) {
      this.campos.nome?.focar()
      return 'Informe o nome do usuário.'
    }
    if (!loginValido(this.formulario.login.trim())) {
      this.campos.login?.focar()
      return TEXTO_POLITICA_LOGIN
    }
    if (perfilStaff(this.formulario.perfil) === null) {
      this.campos.perfil?.focar()
      return 'Escolha um perfil válido.'
    }
    if (this.modo === 'novo') {
      if (!senhaValida(this.formulario.senha)) {
        this.campos.senha?.focar()
        return TEXTO_POLITICA_SENHA
      }
      if (this.formulario.senha !== this.formulario.confirmarSenha) {
        this.campos.confirmarSenha?.focar()
        return 'As senhas não conferem.'
      }
    }
    return null
  }

  private async salvar(): Promise<void> {
    if (!ehAdministrador() || this.salvando) {
      return
    }
    const mensagemValidacao = this.validar()
    if (mensagemValidacao !== null) {
      this.toasts.exibir({ titulo: 'Confira os dados', mensagem: mensagemValidacao, tom: 'alerta' })
      return
    }

    const perfil = perfilStaff(this.formulario.perfil)
    this.salvando = true
    this.painel?.definirDesabilitado(true)
    this.painel?.definirCarregando(true)
    try {
      if (this.modo === 'novo' && perfil !== null) {
        const criado = await this.servico.criar({
          nome: this.formulario.nome.trim(),
          login: this.formulario.login.trim(),
          senha: this.formulario.senha,
          perfil,
        })
        this.toasts.exibir({
          titulo: 'Usuário criado',
          mensagem: `${criado.nome} · ${rotuloPerfil(criado.perfil)}.`,
          tom: 'sucesso',
        })
        this.novo()
        await this.recarregar()
      } else if (this.modo === 'editar' && this.editandoId !== null && perfil !== null) {
        await this.servico.atualizar({
          id: this.editandoId,
          nome: this.formulario.nome.trim(),
          login: this.formulario.login.trim(),
          perfil,
        })
        this.toasts.exibir({
          titulo: 'Usuário salvo',
          mensagem: 'Cadastro atualizado com sucesso.',
          tom: 'sucesso',
        })
        await this.recarregar()
      } else if (this.modo === 'senha' && this.editandoId !== null) {
        const propria = this.selecionado?.id === sessaoAtiva()?.usuarioId
        await this.servico.alterarSenha({
          id: this.editandoId,
          senhaNova: this.formulario.senha,
          ...(propria ? { senhaAtual: this.formulario.senhaAtual } : {}),
        })
        this.formulario.senha = ''
        this.formulario.confirmarSenha = ''
        this.formulario.senhaAtual = ''
        this.toasts.exibir({
          titulo: 'Senha alterada',
          mensagem: 'A nova senha já pode ser usada.',
          tom: 'sucesso',
        })
        this.cancelarEdicao()
      }
    } catch (erro) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: mensagemErro(erro),
        tom: 'erro',
      })
    } finally {
      this.salvando = false
      this.painel?.definirCarregando(false)
      this.painel?.definirDesabilitado(false)
    }
  }

  private confirmar(opcoes: Confirmacao): void {
    this.modal?.fechar()
    const cancelar = new Botao({
      texto: 'Cancelar',
      variante: 'secundario',
      aoClicar: () => this.modal?.fechar(),
    })
    const confirmar = new Botao({
      texto: opcoes.rotulo,
      variante: 'destrutivo',
      aoClicar: () => {
        this.modal?.fechar()
        opcoes.acao()
      },
    })
    const modal = new Modal({
      id: 'usuarios-confirmacao',
      titulo: opcoes.titulo,
      conteudo: criarElemento('p', { className: 'text-sm text-grafite', texto: opcoes.mensagem }),
      rodape: [cancelar.raiz, confirmar.raiz],
      aoFechar: () => {
        this.modal = null
      },
    })
    this.modal = modal
    modal.abrir()
  }

  private acoes(usuario: UsuarioPublico): Node {
    const editar = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Editar',
    })
    editar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(usuario)
    })

    const senha = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Senha',
    })
    senha.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.trocarSenha(usuario)
    })

    const propria = usuario.id === sessaoAtiva()?.usuarioId
    const situacao = criarElemento('button', {
      className: usuario.ativo ? CLASSES.acaoPerigo : CLASSES.acao,
      atributos: { type: 'button' },
      texto: usuario.ativo ? 'Inativar' : 'Ativar',
    })
    situacao.disabled = propria
    situacao.addEventListener('click', (evento) => {
      evento.stopPropagation()
      if (usuario.ativo) {
        this.confirmar({
          titulo: 'Inativar usuário',
          mensagem: `Inativar ${usuario.nome}? Ele deixará de poder entrar no sistema.`,
          rotulo: 'Inativar',
          acao: () => {
            void this.alterarSituacao(usuario, false)
          },
        })
        return
      }
      void this.alterarSituacao(usuario, true)
    })

    return criarElemento('div', { className: CLASSES.acoes, filhos: [editar, senha, situacao] })
  }

  private async alterarSituacao(usuario: UsuarioPublico, ativo: boolean): Promise<void> {
    try {
      if (ativo) {
        // Não existe canal de ativação: `atualizar` é a única operação disponível.
        await this.servico.atualizar({ id: usuario.id, ativo: true })
      } else {
        const atual = await this.servico.buscarPorId(usuario.id)
        if (!atual.ativo) {
          this.toasts.exibir({
            titulo: 'Usuário já inativo',
            mensagem: `${atual.nome} já está inativo.`,
            tom: 'alerta',
          })
          await this.recarregar()
          return
        }
        await this.servico.inativar(atual.id)
      }
      this.toasts.exibir({
        titulo: ativo ? 'Usuário ativado' : 'Usuário inativado',
        mensagem: `${usuario.nome} · ${ativo ? 'acesso liberado' : 'acesso bloqueado'}.`,
        tom: 'sucesso',
      })
      await this.recarregar()
    } catch (erro) {
      this.toasts.exibir({
        titulo: 'Não foi possível alterar a situação',
        mensagem: mensagemErro(erro),
        tom: 'erro',
      })
    }
  }
}
