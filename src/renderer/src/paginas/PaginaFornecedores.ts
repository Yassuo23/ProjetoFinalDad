import type {
  Fornecedor,
  FornecedorAtualizarEntrada,
  FornecedorCriarEntrada,
  TipoFornecedor,
} from '../../../shared/contratos/modelos'
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
  substituirConteudo,
} from '../nucleo'
import { ServicoFornecedores, ServicoIntegracoes } from '../servicos'
import { formatadorPtBr } from '../util'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-[1fr_14rem]',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoSemPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeContainer: 'max-w-2xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  campoComAcao: 'flex flex-col gap-2',
  linhaAcao: 'flex justify-end',
  ajudaIntegracao: 'text-xs text-floresta/70',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
  textoLeitura: 'text-sm text-grafite',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'

const TIPOS: readonly TipoFornecedor[] = ['Compra', 'Manutenção', 'Ambos']

interface FormularioFornecedor {
  nome: string
  cnpj: string
  telefone: string
  email: string
  tipo: string
}

function formularioVazio(): FormularioFornecedor {
  return { nome: '', cnpj: '', telefone: '', email: '', tipo: '' }
}

function formularioDe(fornecedor: Fornecedor): FormularioFornecedor {
  return {
    nome: fornecedor.nome,
    cnpj: formatadorPtBr.cnpj(fornecedor.cnpj),
    telefone: formatadorPtBr.telefone(fornecedor.telefone ?? ''),
    email: fornecedor.email ?? '',
    tipo: fornecedor.tipo ?? '',
  }
}

function opcional(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function ehTipoFornecedor(valor: string): valor is TipoFornecedor {
  return TIPOS.some((tipo) => tipo === valor)
}

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

const COLUNAS: readonly ColunaTabela<Fornecedor>[] = [
  { chave: 'nome', rotulo: 'Razão social', ordenavel: true },
  {
    chave: 'tipo',
    rotulo: 'Tipo',
    celula: (linha) =>
      new Badge({
        texto: linha.tipo ?? 'Não informado',
        tom: 'neutro',
      }).raiz,
  },
  { chave: 'email', rotulo: 'Contato' },
  { chave: 'telefone', rotulo: 'Telefone', celula: (linha) => formatadorPtBr.telefone(linha.telefone ?? '') },
  {
    chave: 'ativo',
    rotulo: 'Situação',
    celula: (linha) =>
      new Badge({
        texto: linha.ativo ? 'Ativo' : 'Inativo',
        tom: linha.ativo ? 'sucesso' : 'neutro',
      }).raiz,
  },
]

export class PaginaFornecedores extends Componente {
  private readonly servico = new ServicoFornecedores()
  private readonly integracoes = new ServicoIntegracoes()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private registros: readonly Fornecedor[] = []
  private selecionado: Fornecedor | null = null
  private editandoId: number | null = null
  private formulario: FormularioFornecedor = formularioVazio()
  private campos: {
    nome: Campo
    cnpj: Campo
    telefone: Campo
    email: Campo
    tipo: Select
  } | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null
  private areaConteudo: HTMLElement | null = null
  private campoBusca: Campo | null = null
  private selectTipo: Select | null = null
  private botaoCnpj: Botao | null = null
  private consultandoCnpj = false
  private modal: Modal | null = null
  private busca = ''
  private tipo = ''
  private carregando = true
  private falhaLista: string | null = null
  private painelOculto = false

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))

    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => this.novo(),
      aoBuscar: () => this.campoBusca?.focar(),
      aoRecarregar: () => {
        void this.recarregar()
      },
      aoEditar: () => this.editarSelecionado(),
      aoConfirmar: () => this.verEquipamentos(),
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
      this.registros = await this.servico.listar()
    } catch {
      this.falhaLista = 'Não foi possível carregar os fornecedores. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: 'Não foi possível carregar os fornecedores. Tente novamente.',
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
          this.editandoId = null
        }
      }
      this.painelOculto = this.registros.length === 0 && this.editandoId === null
      this.montarEstrutura()
    }
  }

  private montarEstrutura(): void {
    if (!ehAdministrador()) {
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'pessoas',
        titulo: 'Área administrativa',
        mensagem: 'Somente o administrador pode consultar e cadastrar fornecedores.',
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
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Fornecedores' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Compra, manutenção e contatos da loja.',
            }),
          ],
        }),
        new Botao({ texto: 'Novo fornecedor', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.campoBusca = new Campo({
      id: 'fornecedores-busca',
      rotulo: 'Buscar fornecedor',
      placeholder: 'Razão social ou CNPJ',
      icone: ICONE_BUSCA,
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarTabela()
      },
    })
    this.selectTipo = new Select({
      id: 'fornecedores-tipo',
      rotulo: 'Tipo',
      placeholder: 'Todos',
      valorInicial: this.tipo,
      opcoes: TIPOS.map((tipo) => ({ valor: tipo, rotulo: tipo })),
      aoAlterar: (valor) => {
        this.tipo = valor
        this.atualizarTabela()
      },
    })

    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [this.campoBusca.raiz, this.selectTipo.raiz],
    })

    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.areaConteudo = criarElemento('div', {
      className: this.painelOculto ? CLASSES.conteudoSemPainel : CLASSES.conteudoComPainel,
      filhos: [this.painelSlot, this.areaTabela],
    })

    substituirConteudo(this.elemento, cabecalho, filtros, this.areaConteudo)
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private atualizarPainel(): void {
    if (this.painelSlot === null || this.areaConteudo === null || !ehAdministrador()) {
      return
    }
    this.areaConteudo.className = this.painelOculto
      ? CLASSES.conteudoSemPainel
      : CLASSES.conteudoComPainel

    if (this.painelOculto) {
      this.painelSlot.replaceChildren()
      this.painel = null
      return
    }

    const corpo = this.construirFormulario()
    const acoesCabecalho: Node[] = []
    if (this.selecionado !== null) {
      acoesCabecalho.push(
        new Botao({
          texto: 'Inativar',
          variante: 'ghost',
          aoClicar: () => this.confirmarInativacao(),
        }).raiz,
      )
    }

    this.painel = new PainelFormulario({
      id: 'fornecedores-formulario',
      titulo: this.editandoId === null ? 'Novo fornecedor' : 'Editar fornecedor',
      corpo: criarElemento('div', { className: CLASSES.gradeContainer, filhos: [corpo] }),
      rodape: [
        new Botao({ texto: 'Cancelar', variante: 'secundario', aoClicar: () => this.cancelarEdicao() }).raiz,
        new Botao({ texto: 'Salvar', aoClicar: () => void this.salvar() }).raiz,
      ],
      acoesCabecalho,
      carregando: this.carregando,
      desabilitado: this.carregando,
      selecionado: this.selecionado !== null,
      mensagemCarregando: 'Carregando formulário…',
    })
    this.painelSlot.replaceChildren(this.painel.raiz)

    const grade = this.campos?.nome.raiz.parentElement
    grade?.addEventListener('keydown', (evento) => {
      if (!(evento instanceof KeyboardEvent)) {
        return
      }
      if (
        evento.key === 'Enter' &&
        (evento.target instanceof HTMLInputElement || evento.target instanceof HTMLSelectElement)
      ) {
        evento.preventDefault()
        void this.salvar()
      }
    })
  }

  private construirFormulario(): HTMLElement {
    const estado = this.formulario
    const campos = {
      nome: new Campo({
        id: 'fornecedor-nome',
        rotulo: 'Razão social',
        obrigatorio: true,
        valorInicial: estado.nome,
        placeholder: 'Aventura Ltda',
        aoAlterar: (valor) => {
          estado.nome = valor
          campos.nome.definirErro(null)
        },
      }),
      cnpj: new Campo({
        id: 'fornecedor-cnpj',
        rotulo: 'CNPJ',
        obrigatorio: true,
        valorInicial: estado.cnpj,
        placeholder: '00.000.000/0000-00',
        aoAlterar: (valor) => {
          estado.cnpj = valor
          campos.cnpj.definirValor(formatadorPtBr.cnpj(valor))
          campos.cnpj.definirErro(null)
        },
      }),
      tipo: new Select({
        id: 'fornecedor-tipo',
        rotulo: 'Tipo',
        placeholder: 'Selecione',
        valorInicial: estado.tipo,
        opcoes: TIPOS.map((tipo) => ({ valor: tipo, rotulo: tipo })),
        aoAlterar: (valor) => {
          estado.tipo = valor
        },
      }),
      email: new Campo({
        id: 'fornecedor-email',
        rotulo: 'E-mail de contato',
        tipo: 'email',
        valorInicial: estado.email,
        placeholder: 'contato@empresa.com',
        aoAlterar: (valor) => {
          estado.email = valor
          campos.email.definirErro(null)
        },
      }),
      telefone: new Campo({
        id: 'fornecedor-telefone',
        rotulo: 'Telefone',
        tipo: 'tel',
        valorInicial: estado.telefone,
        placeholder: '(11) 3333-4444',
        aoAlterar: (valor) => {
          estado.telefone = valor
          campos.telefone.definirValor(formatadorPtBr.telefone(valor))
        },
      }),
    }

    this.campos = campos

    const botaoCnpj = new Botao({
      id: 'fornecedor-cnpj-buscar',
      texto: 'Buscar dados do CNPJ',
      variante: 'secundario',
      aoClicar: () => {
        void this.consultarCnpj()
      },
    })
    this.botaoCnpj = botaoCnpj
    const cnpjComAcao = criarElemento('div', {
      className: CLASSES.campoComAcao,
      filhos: [
        campos.cnpj.raiz,
        criarElemento('div', {
          className: CLASSES.linhaAcao,
          filhos: [botaoCnpj.raiz],
        }),
        criarElemento('p', {
          className: CLASSES.ajudaIntegracao,
          texto: 'Consulta opcional: preenche a razão social quando o serviço estiver disponível.',
        }),
      ],
    })

    return criarElemento('div', {
      className: CLASSES.gradeCampos,
      filhos: [
        campos.nome.raiz,
        cnpjComAcao,
        campos.tipo.raiz,
        campos.email.raiz,
        campos.telefone.raiz,
      ],
    })
  }

  private atualizarTabela(): void {
    if (this.areaTabela === null || !ehAdministrador()) {
      return
    }

    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({ mensagem: 'Carregando fornecedores…', variante: 'skeleton', linhas: 3 }).montar(
        area,
      )
      this.areaTabela.replaceChildren(area)
      return
    }

    if (this.falhaLista !== null && this.registros.length === 0) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.falhaLista,
        aoTentar: () => {
          void this.recarregar()
        },
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    const filtrados = this.filtrar()
    if (filtrados.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'pessoas',
        titulo: 'Nenhum fornecedor cadastrado',
        mensagem:
          this.busca.trim() === '' && this.tipo === ''
            ? 'Cadastre o primeiro fornecedor.'
            : 'Nenhum fornecedor com esses filtros. Tente outros critérios.',
        acao: {
          texto: this.busca.trim() === '' && this.tipo === '' ? 'Novo fornecedor' : 'Limpar filtros',
          aoClicar: () => {
            if (this.busca.trim() === '' && this.tipo === '') {
              this.novo()
              return
            }
            this.busca = ''
            this.tipo = ''
            this.campoBusca?.definirValor('')
            this.selectTipo?.definirValor('')
            this.atualizarTabela()
          },
        },
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    const tabela = new Tabela<Fornecedor>({
      colunas: [
        ...COLUNAS,
        {
          chave: 'atualizadoEm',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoes(linha),
        },
      ],
      linhas: filtrados,
      mensagemVazia: 'Nenhum fornecedor cadastrado.',
      aoSelecionar: (linha) => this.selecionar(linha),
      linhaSelecionada: (linha) => this.selecionado?.id === linha.id,
    })

    const cabecalho = tabela.raiz.querySelector('thead')
    if (cabecalho !== null) {
      cabecalho.className = CLASSES.cabecalhoFixo
    }

    this.areaTabela.replaceChildren(
      criarElemento('div', { className: CLASSES.tabelaScroll, filhos: [tabela.raiz] }),
    )
    if (this.falhaLista !== null) {
      this.areaTabela.append(
        criarElemento('div', {
          className: CLASSES.avisoDesatualizado,
          texto: 'Dados desatualizados · tente recarregar',
        }),
      )
    }
  }

  private criarAcoes(fornecedor: Fornecedor): HTMLElement {
    const container = criarElemento('div', { className: CLASSES.acoes })

    const ver = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Ver equipamentos',
    })
    ver.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(fornecedor)
      this.verEquipamentos()
    })
    container.append(ver)

    const editar = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Editar',
    })
    editar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(fornecedor)
      this.editarSelecionado()
    })
    container.append(editar)

    const inativar = criarElemento('button', {
      className: CLASSES.acaoPerigo,
      atributos: { type: 'button' },
      texto: 'Inativar',
    })
    inativar.disabled = !fornecedor.ativo
    inativar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(fornecedor)
      this.confirmarInativacao()
    })
    container.append(inativar)

    return container
  }

  private filtrar(): readonly Fornecedor[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    return this.registros.filter((fornecedor) => {
      const combinaBusca =
        termo === '' ||
        [fornecedor.nome, fornecedor.cnpj, fornecedor.email ?? ''].some((valor) =>
          valor.toLocaleLowerCase('pt-BR').includes(termo),
        )
      const combinaTipo = this.tipo === '' || fornecedor.tipo === this.tipo
      return combinaBusca && combinaTipo
    })
  }

  private selecionar(fornecedor: Fornecedor): void {
    this.selecionado = fornecedor
    this.formulario = formularioDe(fornecedor)
    this.editandoId = fornecedor.id
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private novo(): void {
    if (!ehAdministrador()) {
      return
    }
    this.selecionado = null
    this.editandoId = null
    this.formulario = formularioVazio()
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
    this.painel?.focarPrimeiroControle()
  }

  private editarSelecionado(): void {
    if (!ehAdministrador()) {
      return
    }
    if (this.selecionado === null) {
      this.toasts.exibir({
        mensagem: 'Selecione um fornecedor na tabela antes de editar.',
        tom: 'alerta',
      })
      return
    }
    this.selecionar(this.selecionado)
    this.painel?.focarPrimeiroControle()
  }

  private verEquipamentos(): void {
    if (this.selecionado === null) {
      this.toasts.exibir({
        mensagem: 'Selecione um fornecedor na tabela para ver seus equipamentos.',
        tom: 'alerta',
      })
      return
    }
    window.location.hash = '#/equipamentos'
    this.toasts.exibir({
      titulo: 'Equipamentos',
      mensagem: `Filtre por ${this.selecionado.nome}. O roteador ainda não aceita parâmetros na URL.`,
      tom: 'informacao',
    })
  }

  private cancelarEdicao(): void {
    if (!ehAdministrador()) {
      return
    }
    if (this.editandoId !== null || this.selecionado !== null) {
      this.novo()
      return
    }
    if (this.busca !== '' || this.tipo !== '') {
      this.busca = ''
      this.tipo = ''
      this.campoBusca?.definirValor('')
      this.selectTipo?.definirValor('')
      this.atualizarTabela()
    }
  }

  private async consultarCnpj(): Promise<void> {
    const digitos = formatadorPtBr.digitos(this.formulario.cnpj)
    if (digitos.length !== 14) {
      this.campos?.cnpj.definirErro('Informe um CNPJ com 14 dígitos antes de consultar.')
      return
    }
    if (this.consultandoCnpj) {
      return
    }

    this.consultandoCnpj = true
    this.botaoCnpj?.definirDesabilitado(true)
    try {
      const resposta = await this.integracoes.cnpj(digitos)
      if (resposta.estado === 'disponivel') {
        const razaoSocial = resposta.dados.razaoSocial.trim()
        if (razaoSocial !== '') {
          this.formulario.nome = razaoSocial
          this.campos?.nome.definirValor(razaoSocial)
          this.campos?.nome.definirErro(null)
        }
        this.campos?.cnpj.definirErro(null)
        this.toasts.exibir({
          titulo: 'CNPJ consultado',
          mensagem:
            razaoSocial === ''
              ? 'Dados recebidos. Confira os campos manualmente.'
              : `Razão social preenchida: ${razaoSocial}. Confira os demais dados.`,
          tom: 'sucesso',
        })
        return
      }

      this.toasts.exibir({
        titulo: 'Consulta indisponível',
        mensagem:
          'O serviço de CNPJ não respondeu. Preencha os dados manualmente; o cadastro continua disponível.',
        tom: 'alerta',
      })
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível consultar',
        mensagem: 'Continue preenchendo manualmente. A consulta não bloqueia o cadastro.',
        tom: 'alerta',
      })
    } finally {
      this.consultandoCnpj = false
      this.botaoCnpj?.definirDesabilitado(false)
    }
  }

  private validar(): boolean {
    const campos = this.campos
    if (campos === null) {
      return false
    }
    let valido = true
    const marcar = (campo: Campo | Select, mensagem: string | null): void => {
      campo.definirErro(mensagem)
      if (mensagem !== null) {
        valido = false
      }
    }

    marcar(campos.nome, this.formulario.nome.trim() === '' ? 'Informe a razão social.' : null)
    marcar(
      campos.cnpj,
      formatadorPtBr.digitos(this.formulario.cnpj).length !== 14 ? 'Informe um CNPJ com 14 dígitos.' : null,
    )
    const email = this.formulario.email.trim()
    marcar(
      campos.email,
      email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Informe um e-mail válido.'
        : null,
    )
    return valido
  }

  private async salvar(): Promise<void> {
    if (!ehAdministrador()) {
      return
    }
    if (!this.validar()) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Revise o formulário',
        mensagem: 'Corrija os campos destacados para salvar.',
        tom: 'alerta',
      })
      return
    }
    this.painel?.definirErro(false)

    const tipo = ehTipoFornecedor(this.formulario.tipo) ? this.formulario.tipo : null
    const dadosComuns = {
      nome: this.formulario.nome.trim(),
      cnpj: formatadorPtBr.digitos(this.formulario.cnpj),
      telefone: opcional(formatadorPtBr.digitos(this.formulario.telefone)),
      email: opcional(this.formulario.email),
      tipo,
    }

    try {
      if (this.editandoId === null) {
        const criar: FornecedorCriarEntrada = dadosComuns
        await this.servico.criar(criar)
      } else {
        const atualizar: FornecedorAtualizarEntrada = { id: this.editandoId, ...dadosComuns }
        await this.servico.atualizar(atualizar)
      }
      this.toasts.exibir({
        titulo: 'Fornecedor salvo',
        mensagem: 'Cadastro atualizado com sucesso.',
        tom: 'sucesso',
      })
      this.novo()
      await this.recarregar()
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: 'Verifique os dados e tente novamente.',
        tom: 'erro',
      })
    }
  }

  private confirmarInativacao(): void {
    const fornecedor = this.selecionado
    if (!ehAdministrador() || fornecedor === null || !fornecedor.ativo) {
      return
    }
    this.confirmar({
      titulo: 'Inativar fornecedor',
      mensagem: `Inativar ${fornecedor.nome}? O fornecedor deixará de aparecer nas consultas.`,
      rotulo: 'Inativar',
      acao: () => {
        void (async () => {
          try {
            await this.servico.inativar(fornecedor.id)
            this.toasts.exibir({
              titulo: 'Fornecedor inativado',
              mensagem: 'O registro não aparecerá mais nas consultas.',
              tom: 'sucesso',
            })
            this.novo()
            await this.recarregar()
          } catch {
            this.toasts.exibir({
              titulo: 'Não foi possível inativar',
              mensagem: 'Tente novamente em instantes.',
              tom: 'erro',
            })
          }
        })()
      },
    })
  }

  private confirmar(opcoes: Confirmacao): void {
    if (this.modal !== null) {
      return
    }
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
      id: 'fornecedores-confirmacao',
      titulo: opcoes.titulo,
      conteudo: criarElemento('p', { className: CLASSES.textoLeitura, texto: opcoes.mensagem }),
      rodape: [cancelar.raiz, confirmar.raiz],
      aoFechar: () => {
        this.modal = null
      },
    })
    this.modal = modal
    modal.abrir()
  }
}
