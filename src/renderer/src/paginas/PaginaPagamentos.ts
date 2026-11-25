import type {
  FormaPagamento,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  Reserva,
  StatusPagamento,
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
import { ServicoClientes, ServicoPagamentos, ServicoReservas } from '../servicos'
import { formatadorPtBr } from '../util'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-4',
  kpis: 'grid grid-cols-1 gap-4 md:grid-cols-3',
  card: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  cardTitulo: 'font-display text-base text-floresta',
  cardCorpo: 'mt-2 text-sm text-grafite',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoSemPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeContainer: 'max-w-2xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
  leituraLinha: 'mb-2 text-sm text-grafite',
  leituraTitulo: 'font-semibold text-floresta',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'
const FORMAS: readonly FormaPagamento[] = ['Pix', 'Cartão de Crédito', 'Dinheiro']
const STATUS: readonly StatusPagamento[] = ['Pendente', 'Pago', 'Estornado']

interface FormularioPagamento {
  reservaId: string
  valorBase: string
  valorMulta: string
  formaPagamento: string
  statusPagamento: string
  dataPagamento: string
}

type PatchPagamento = {
  id: number
  reservaId?: number
  valorBase?: number
  valorMulta?: number
  formaPagamento?: FormaPagamento | null
  statusPagamento?: StatusPagamento
  dataPagamento?: string | null
}

type CamposPagamento = {
  reservaId: Campo
  valorBase: Campo
  valorMulta: Campo
  formaPagamento: Select
  statusPagamento: Select
  dataPagamento: Campo
}

interface LinhaPagamento {
  readonly id: number
  readonly reserva: string
  readonly cliente: string
  readonly tipo: string
  readonly valor: number
  readonly forma: string
  readonly status: StatusPagamento
  readonly data: string
  readonly ativo: boolean
  readonly acoes: string
}

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

function formularioVazio(): FormularioPagamento {
  return {
    reservaId: '',
    valorBase: '',
    valorMulta: '',
    formaPagamento: '',
    statusPagamento: 'Pendente',
    dataPagamento: '',
  }
}

function formularioDe(pagamento: Pagamento): FormularioPagamento {
  return {
    reservaId: String(pagamento.reservaId),
    valorBase: pagamento.valorBase.toFixed(2),
    valorMulta: pagamento.valorMulta.toFixed(2),
    formaPagamento: pagamento.formaPagamento ?? '',
    statusPagamento: pagamento.statusPagamento,
    dataPagamento: pagamento.dataPagamento === null ? '' : pagamento.dataPagamento.slice(0, 10),
  }
}

function ehFormaPagamento(valor: string): valor is FormaPagamento {
  return FORMAS.some((forma) => forma === valor)
}

function ehStatusPagamento(valor: string): valor is StatusPagamento {
  return STATUS.some((status) => status === valor)
}

function badgeStatus(status: StatusPagamento): Badge {
  const tom = status === 'Pago' ? 'sucesso' : status === 'Pendente' ? 'alerta' : 'erro'
  return new Badge({ texto: status, tom })
}

function badgeAtivo(ativo: boolean): Badge {
  return new Badge({ texto: ativo ? 'Ativo' : 'Inativo', tom: ativo ? 'sucesso' : 'neutro' })
}

const COLUNAS: readonly ColunaTabela<LinhaPagamento>[] = [
  { chave: 'reserva', rotulo: 'Reserva', ordenavel: true },
  { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
  { chave: 'tipo', rotulo: 'Tipo' },
  {
    chave: 'valor',
    rotulo: 'Valor',
    alinhamento: 'direita',
    ordenavel: true,
    celula: (linha) => formatadorPtBr.moeda(linha.valor),
  },
  { chave: 'forma', rotulo: 'Forma' },
  {
    chave: 'status',
    rotulo: 'Status',
    celula: (linha) => badgeStatus(linha.status).raiz,
  },
  { chave: 'data', rotulo: 'Pagamento' },
  {
    chave: 'ativo',
    rotulo: 'Situação',
    celula: (linha) => badgeAtivo(linha.ativo).raiz,
  },
]

export class PaginaPagamentos extends Componente {
  private readonly servico = new ServicoPagamentos()
  private readonly servicoReservas = new ServicoReservas()
  private readonly servicoClientes = new ServicoClientes()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private pagamentos: readonly Pagamento[] = []
  private clientes = new Map<number, string>()
  private reservas = new Map<number, Reserva>()
  private selecionado: Pagamento | null = null
  private editandoId: number | null = null
  private original: FormularioPagamento | null = null
  private formulario: FormularioPagamento = formularioVazio()
  private campos: CamposPagamento | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null
  private areaConteudo: HTMLElement | null = null
  private kpiSlot: HTMLElement | null = null
  private campoBusca: Campo | null = null
  private selectStatusFiltro: Select | null = null
  private campoInicio: Campo | null = null
  private campoFim: Campo | null = null
  private modal: Modal | null = null
  private busca = ''
  private statusFiltro = ''
  private inicio = ''
  private fim = ''
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
      aoConfirmar: () => this.confirmarSelecionado(),
      aoCancelar: () => this.cancelarEdicao(),
      emCampo: () => false,
      modalAberto: () => this.modal !== null,
    })
    this.cancelarPerfil = observarPerfil(() => this.montarEstrutura())
  }

  protected aoMontar(): void {
    this.toasts.montarFilho(document.body)
    this.montarEstrutura()
    void this.recarregar()
  }

  protected aoDesmontar(): void {
    this.cancelarAtalhos()
    this.cancelarPerfil()
    this.modal?.fechar()
    this.modal = null
    this.toasts.destruir()
  }

  private async recarregar(): Promise<void> {
    this.carregando = true
    this.falhaLista = null
    this.montarEstrutura()

    try {
      const incluirInativos = ehAdministrador() ? { incluirInativos: true } : undefined
      const [resultados, reservas, clientes] = await Promise.all([
        this.servico.listar(incluirInativos),
        this.servicoReservas.listar(incluirInativos),
        this.servicoClientes.listar(incluirInativos),
      ])
      this.pagamentos = resultados
      this.reservas = new Map(reservas.map((reserva) => [reserva.id, reserva]))
      this.clientes = new Map(clientes.map((cliente) => [cliente.id, cliente.nome]))
    } catch {
      this.falhaLista = 'Não foi possível carregar os pagamentos. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: 'Não foi possível carregar os pagamentos. Tente novamente.',
        tom: 'erro',
      })
    } finally {
      this.carregando = false
      if (this.selecionado !== null) {
        const atual = this.pagamentos.find((item) => item.id === this.selecionado?.id)
        this.selecionado = atual ?? null
        if (atual !== undefined) {
          this.formulario = formularioDe(atual)
          if (this.editandoId === atual.id) {
            this.original = formularioDe(atual)
          }
        } else {
          this.editandoId = null
          this.original = null
        }
      }
      this.painelOculto = this.pagamentos.length === 0 && this.editandoId === null
      this.montarEstrutura()
    }
  }

  private montarEstrutura(): void {
    const admin = ehAdministrador()
    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Pagamentos' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: admin
                ? 'Reservas, multas, baixas e estornos.'
                : 'Consulta somente leitura dos pagamentos.',
            }),
          ],
        }),
        ...(admin
          ? [new Botao({ texto: 'Registrar pagamento', aoClicar: () => this.novo() }).raiz]
          : []),
      ],
    })

    this.campoBusca = new Campo({
      id: 'pagamentos-busca',
      rotulo: 'Buscar',
      placeholder: 'Reserva ou cliente',
      icone: ICONE_BUSCA,
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarKpis()
        this.atualizarTabela()
      },
    })
    this.selectStatusFiltro = new Select({
      id: 'pagamentos-status-filtro',
      rotulo: 'Status',
      placeholder: 'Todos',
      valorInicial: this.statusFiltro,
      opcoes: STATUS.map((status) => ({ valor: status, rotulo: status })),
      aoAlterar: (valor) => {
        this.statusFiltro = valor
        this.atualizarKpis()
        this.atualizarTabela()
      },
    })
    this.campoInicio = new Campo({
      id: 'pagamentos-inicio',
      rotulo: 'Período de',
      tipo: 'date',
      valorInicial: this.inicio,
      aoAlterar: (valor) => {
        this.inicio = valor
        this.atualizarKpis()
        this.atualizarTabela()
      },
    })
    this.campoFim = new Campo({
      id: 'pagamentos-fim',
      rotulo: 'Período até',
      tipo: 'date',
      valorInicial: this.fim,
      aoAlterar: (valor) => {
        this.fim = valor
        this.atualizarKpis()
        this.atualizarTabela()
      },
    })

    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [
        this.campoBusca.raiz,
        this.selectStatusFiltro.raiz,
        this.campoInicio.raiz,
        this.campoFim.raiz,
      ],
    })
    this.kpiSlot = criarElemento('div', { className: CLASSES.kpis })

    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.areaConteudo = criarElemento('div', {
      className: this.painelOculto ? CLASSES.conteudoSemPainel : CLASSES.conteudoComPainel,
      filhos: [this.painelSlot, this.areaTabela],
    })

    substituirConteudo(this.elemento, cabecalho, filtros, this.kpiSlot, this.areaConteudo)
    this.atualizarKpis()
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private atualizarKpis(): void {
    if (this.kpiSlot === null) {
      return
    }
    const filtrados = this.filtrar()
    const recebido = filtrados
      .filter((item) => item.statusPagamento === 'Pago')
      .reduce((total, item) => total + item.valorTotal, 0)
    const pendente = filtrados
      .filter((item) => item.statusPagamento === 'Pendente')
      .reduce((total, item) => total + item.valorTotal, 0)
    const multas = filtrados.reduce((total, item) => total + item.valorMulta, 0)

    this.kpiSlot.replaceChildren(
      this.criarCard('Recebido', formatadorPtBr.moeda(recebido)),
      this.criarCard('Pendente', formatadorPtBr.moeda(pendente)),
      this.criarCard('Multas', formatadorPtBr.moeda(multas)),
    )
  }

  private criarCard(titulo: string, corpo: string): HTMLElement {
    return criarElemento('div', {
      className: CLASSES.card,
      filhos: [
        criarElemento('h3', { className: CLASSES.cardTitulo, texto: titulo }),
        criarElemento('p', { className: CLASSES.cardCorpo, texto: corpo }),
      ],
    })
  }

  private atualizarPainel(): void {
    if (this.painelSlot === null || this.areaConteudo === null) {
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

    const admin = ehAdministrador()
    const corpo = admin ? this.construirFormulario() : this.construirLeitura()
    const rodape: Node[] =
      admin && !this.carregando
        ? [
            new Botao({ texto: 'Cancelar', variante: 'secundario', aoClicar: () => this.cancelarEdicao() }).raiz,
            new Botao({ texto: 'Salvar', aoClicar: () => void this.salvar() }).raiz,
          ]
        : []

    this.painel = new PainelFormulario({
      id: 'pagamentos-painel',
      titulo: admin
        ? this.editandoId === null
          ? 'Registrar pagamento'
          : 'Editar pagamento'
        : 'Detalhes do pagamento',
      corpo: criarElemento('div', { className: CLASSES.gradeContainer, filhos: [corpo] }),
      rodape,
      carregando: this.carregando,
      desabilitado: this.carregando || !admin,
      selecionado: this.selecionado !== null,
      mensagemCarregando: 'Carregando pagamento…',
    })
    this.painelSlot.replaceChildren(this.painel.raiz)

    if (admin) {
      const grade = this.campos?.reservaId.raiz.parentElement
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
  }

  private construirFormulario(): HTMLElement {
    const estado = this.formulario
    const campos: CamposPagamento = {
      reservaId: new Campo({
        id: 'pagamento-reserva',
        rotulo: 'Reserva',
        obrigatorio: true,
        valorInicial: estado.reservaId,
        placeholder: '1042',
        aoAlterar: (valor) => {
          estado.reservaId = valor
          campos.reservaId.definirErro(null)
        },
      }),
      valorBase: new Campo({
        id: 'pagamento-valor-base',
        rotulo: 'Valor da reserva',
        tipo: 'number',
        obrigatorio: true,
        valorInicial: estado.valorBase,
        placeholder: '0,00',
        aoAlterar: (valor) => {
          estado.valorBase = valor
          campos.valorBase.definirErro(null)
        },
      }),
      valorMulta: new Campo({
        id: 'pagamento-valor-multa',
        rotulo: 'Valor da multa',
        tipo: 'number',
        valorInicial: estado.valorMulta,
        placeholder: '0,00',
        aoAlterar: (valor) => {
          estado.valorMulta = valor
          campos.valorMulta.definirErro(null)
        },
      }),
      formaPagamento: new Select({
        id: 'pagamento-forma',
        rotulo: 'Forma de pagamento',
        placeholder: 'Selecione',
        valorInicial: estado.formaPagamento,
        opcoes: FORMAS.map((forma) => ({ valor: forma, rotulo: forma })),
        aoAlterar: (valor) => {
          estado.formaPagamento = valor
        },
      }),
      statusPagamento: new Select({
        id: 'pagamento-status',
        rotulo: 'Status',
        valorInicial: estado.statusPagamento,
        opcoes: STATUS.map((status) => ({ valor: status, rotulo: status })),
        aoAlterar: (valor) => {
          estado.statusPagamento = valor
        },
      }),
      dataPagamento: new Campo({
        id: 'pagamento-data',
        rotulo: 'Data do pagamento',
        tipo: 'date',
        valorInicial: estado.dataPagamento,
        aoAlterar: (valor) => {
          estado.dataPagamento = valor
        },
      }),
    }

    this.campos = campos
    return criarElemento('div', {
      className: CLASSES.gradeCampos,
      filhos: [
        campos.reservaId.raiz,
        campos.valorBase.raiz,
        campos.valorMulta.raiz,
        campos.formaPagamento.raiz,
        campos.statusPagamento.raiz,
        campos.dataPagamento.raiz,
      ],
    })
  }

  private construirLeitura(): HTMLElement {
    const pagamento = this.selecionado
    const linhas: Array<Node | string> =
      pagamento === null
        ? ['Selecione um pagamento na tabela para ver os detalhes.']
        : [
            this.linhaLeitura('Reserva', `#${pagamento.reservaId}`),
            this.linhaLeitura('Cliente', this.nomeCliente(pagamento.reservaId)),
            this.linhaLeitura(
              'Tipo',
              pagamento.valorMulta > 0 && pagamento.valorBase > 0
                ? 'Reserva + multa'
                : pagamento.valorMulta > 0
                  ? 'Multa'
                  : 'Reserva',
            ),
            this.linhaLeitura('Valor', formatadorPtBr.moeda(pagamento.valorTotal)),
            this.linhaLeitura('Forma', pagamento.formaPagamento ?? '—'),
            this.linhaLeitura('Status', pagamento.statusPagamento),
            this.linhaLeitura('Data', formatadorPtBr.data(pagamento.dataPagamento)),
          ]

    return criarElemento('div', { filhos: linhas })
  }

  private linhaLeitura(titulo: string, valor: string): HTMLElement {
    return criarElemento('p', {
      className: CLASSES.leituraLinha,
      filhos: [
        criarElemento('span', { className: CLASSES.leituraTitulo, texto: `${titulo}: ` }),
        valor,
      ],
    })
  }

  private atualizarTabela(): void {
    if (this.areaTabela === null) {
      return
    }

    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({
        mensagem: 'Carregando pagamentos…',
        variante: 'skeleton',
        linhas: 3,
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    if (this.falhaLista !== null && this.pagamentos.length === 0) {
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
        ilustracao: 'reservas',
        titulo: 'Nenhum pagamento no período',
        mensagem: 'Ajuste o filtro ou registre um novo pagamento.',
        acao: {
          texto: 'Limpar filtros',
          aoClicar: () => this.limparFiltros(),
        },
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    const tabela = new Tabela<LinhaPagamento>({
      colunas: [
        ...COLUNAS,
        {
          chave: 'acoes',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoes(linha.id),
        },
      ],
      linhas: filtrados.map((pagamento) => this.paraLinha(pagamento)),
      mensagemVazia: 'Nenhum pagamento no período.',
      aoSelecionar: (linha) => this.selecionar(linha.id),
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

  private paraLinha(pagamento: Pagamento): LinhaPagamento {
    return {
      id: pagamento.id,
      reserva: `#${pagamento.reservaId}`,
      cliente: this.nomeCliente(pagamento.reservaId),
      tipo:
        pagamento.valorMulta > 0 && pagamento.valorBase > 0
          ? 'Reserva + multa'
          : pagamento.valorMulta > 0
            ? 'Multa'
            : 'Reserva',
      valor: pagamento.valorTotal,
      forma: pagamento.formaPagamento ?? '—',
      status: pagamento.statusPagamento,
      data: formatadorPtBr.data(pagamento.dataPagamento),
      ativo: pagamento.ativo,
      acoes: '',
    }
  }

  private nomeCliente(reservaId: number): string {
    const clienteId = this.reservas.get(reservaId)?.clienteId
    if (clienteId === undefined) {
      return '—'
    }
    return this.clientes.get(clienteId) ?? '—'
  }

  private criarAcoes(id: number): HTMLElement {
    const container = criarElemento('div', { className: CLASSES.acoes })
    const pagamento = this.pagamentos.find((item) => item.id === id)

    const ver = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Ver',
    })
    ver.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(id)
    })
    container.append(ver)

    if (ehAdministrador() && pagamento !== undefined) {
      const editar = criarElemento('button', {
        className: CLASSES.acao,
        atributos: { type: 'button' },
        texto: 'Editar',
      })
      editar.addEventListener('click', (evento) => {
        evento.stopPropagation()
        void this.editar(id)
      })
      container.append(editar)

      if (pagamento.statusPagamento === 'Pendente') {
        const baixar = criarElemento('button', {
          className: CLASSES.acao,
          atributos: { type: 'button' },
          texto: 'Baixar',
        })
        baixar.addEventListener('click', (evento) => {
          evento.stopPropagation()
          this.selecionar(id)
          this.confirmarBaixa(pagamento)
        })
        container.append(baixar)
      }
      if (pagamento.statusPagamento === 'Pago') {
        const estornar = criarElemento('button', {
          className: CLASSES.acaoPerigo,
          atributos: { type: 'button' },
          texto: 'Estornar',
        })
        estornar.addEventListener('click', (evento) => {
          evento.stopPropagation()
          this.selecionar(id)
          this.confirmarEstorno(pagamento)
        })
        container.append(estornar)
      }

      const inativar = criarElemento('button', {
        className: CLASSES.acaoPerigo,
        atributos: { type: 'button' },
        texto: 'Inativar',
      })
      inativar.disabled = !pagamento.ativo
      inativar.addEventListener('click', (evento) => {
        evento.stopPropagation()
        this.confirmarInativacao(pagamento)
      })
      container.append(inativar)
    }

    return container
  }

  private filtrar(): readonly Pagamento[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    return this.pagamentos.filter((pagamento) => {
      const cliente = this.nomeCliente(pagamento.reservaId).toLocaleLowerCase('pt-BR')
      const combinaBusca =
        termo === '' ||
        cliente.includes(termo) ||
        String(pagamento.reservaId).includes(termo) ||
        formatadorPtBr.moeda(pagamento.valorTotal).includes(termo)
      const combinaStatus = this.statusFiltro === '' || pagamento.statusPagamento === this.statusFiltro
      const dia = (pagamento.dataPagamento ?? pagamento.atualizadoEm).slice(0, 10)
      const combinaInicio = this.inicio === '' || dia >= this.inicio
      const combinaFim = this.fim === '' || dia <= this.fim
      return combinaBusca && combinaStatus && combinaInicio && combinaFim
    })
  }

  private limparFiltros(): void {
    this.busca = ''
    this.statusFiltro = ''
    this.inicio = ''
    this.fim = ''
    this.campoBusca?.definirValor('')
    this.selectStatusFiltro?.definirValor('')
    this.campoInicio?.definirValor('')
    this.campoFim?.definirValor('')
    this.atualizarKpis()
    this.atualizarTabela()
  }

  private selecionar(id: number): void {
    const pagamento = this.pagamentos.find((item) => item.id === id)
    if (pagamento === undefined) {
      return
    }
    this.selecionado = pagamento
    this.formulario = formularioDe(pagamento)
    this.original = ehAdministrador() ? formularioDe(pagamento) : null
    this.editandoId = ehAdministrador() ? pagamento.id : null
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private novo(): void {
    if (!ehAdministrador()) {
      this.toasts.exibir({
        mensagem: 'Somente o administrador pode registrar pagamentos.',
        tom: 'alerta',
      })
      return
    }
    this.selecionado = null
    this.editandoId = null
    this.original = null
    this.formulario = formularioVazio()
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
    this.painel?.focarPrimeiroControle()
  }

  private async editar(id: number): Promise<void> {
    if (!ehAdministrador()) {
      return
    }
    try {
      const pagamento = await this.servico.buscarPorId(id)
      const estado = formularioDe(pagamento)
      this.selecionado = pagamento
      this.original = estado
      this.formulario = { ...estado }
      this.editandoId = id
      this.painelOculto = false
      this.atualizarPainel()
      this.atualizarTabela()
      this.painel?.focarPrimeiroControle()
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível abrir',
        mensagem: 'Não foi possível carregar este pagamento. Tente novamente.',
        tom: 'erro',
      })
    }
  }

  private editarSelecionado(): void {
    if (!ehAdministrador()) {
      return
    }
    if (this.selecionado === null) {
      this.toasts.exibir({
        mensagem: 'Selecione um pagamento na tabela antes de editar.',
        tom: 'alerta',
      })
      return
    }
    void this.editar(this.selecionado.id)
  }

  private confirmarSelecionado(): void {
    if (this.selecionado !== null) {
      this.selecionar(this.selecionado.id)
      return
    }
    this.novo()
  }

  private cancelarEdicao(): void {
    if (this.editandoId !== null || this.selecionado !== null) {
      this.novo()
      return
    }
    if (this.busca !== '' || this.statusFiltro !== '' || this.inicio !== '' || this.fim !== '') {
      this.limparFiltros()
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

    const reservaId = Number(this.formulario.reservaId.trim())
    marcar(
      campos.reservaId,
      !Number.isSafeInteger(reservaId) || reservaId <= 0 ? 'Informe um número de reserva válido.' : null,
    )
    const valorBase = Number(this.formulario.valorBase)
    marcar(
      campos.valorBase,
      !Number.isFinite(valorBase) || valorBase < 0 ? 'Informe um valor válido.' : null,
    )
    const valorMulta = Number(this.formulario.valorMulta === '' ? '0' : this.formulario.valorMulta)
    marcar(
      campos.valorMulta,
      !Number.isFinite(valorMulta) || valorMulta < 0 ? 'Informe um valor válido.' : null,
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

    const status = ehStatusPagamento(this.formulario.statusPagamento)
      ? this.formulario.statusPagamento
      : 'Pendente'
    const forma = ehFormaPagamento(this.formulario.formaPagamento)
      ? this.formulario.formaPagamento
      : null
    const dataPagamento =
      status === 'Pago'
        ? this.formulario.dataPagamento === ''
          ? new Date().toISOString()
          : new Date(`${this.formulario.dataPagamento}T12:00:00`).toISOString()
        : null
    const dataFormulario = dataPagamento === null ? '' : dataPagamento.slice(0, 10)

    try {
      let idAfetado: number
      if (this.editandoId === null) {
        const criar: PagamentoCriarEntrada = {
          reservaId: Number(this.formulario.reservaId.trim()),
          valorBase: Number(this.formulario.valorBase),
          valorMulta: Number(this.formulario.valorMulta === '' ? '0' : this.formulario.valorMulta),
          formaPagamento: forma,
          statusPagamento: status,
          dataPagamento,
        }
        idAfetado = (await this.servico.criar(criar)).id
      } else {
        const original = this.original ?? formularioVazio()
        const atualizar: PatchPagamento = { id: this.editandoId }
        if (this.formulario.reservaId !== original.reservaId) {
          atualizar.reservaId = Number(this.formulario.reservaId.trim())
        }
        if (this.formulario.valorBase !== original.valorBase) {
          atualizar.valorBase = Number(this.formulario.valorBase)
        }
        if (this.formulario.valorMulta !== original.valorMulta) {
          atualizar.valorMulta = Number(this.formulario.valorMulta === '' ? '0' : this.formulario.valorMulta)
        }
        if (this.formulario.formaPagamento !== original.formaPagamento) {
          atualizar.formaPagamento = forma
        }
        if (this.formulario.statusPagamento !== original.statusPagamento) {
          atualizar.statusPagamento = status
        }
        if (status !== original.statusPagamento || dataFormulario !== original.dataPagamento) {
          atualizar.dataPagamento = dataPagamento
        }
        if (Object.keys(atualizar).length === 1) {
          this.toasts.exibir({
            titulo: 'Nenhuma alteração',
            mensagem: 'Os valores já estavam salvos.',
            tom: 'informacao',
          })
          return
        }
        const entrada: PagamentoAtualizarEntrada = atualizar
        await this.servico.atualizar(entrada)
        idAfetado = this.editandoId
      }
      this.toasts.exibir({
        titulo: 'Pagamento salvo',
        mensagem: 'Registro atualizado com sucesso.',
        tom: 'sucesso',
      })
      this.limparFiltros()
      this.selecionado = null
      this.editandoId = null
      this.original = null
      this.formulario = formularioVazio()
      await this.recarregar()
      this.selecionar(idAfetado)
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: 'Verifique os dados e tente novamente.',
        tom: 'erro',
      })
    }
  }

  private confirmarInativacao(pagamento: Pagamento): void {
    if (!ehAdministrador() || !pagamento.ativo || this.modal !== null) {
      return
    }
    this.confirmar({
      titulo: 'Inativar pagamento',
      mensagem: `Inativar o pagamento da reserva #${pagamento.reservaId}? O registro será preservado e marcado como Inativo.`,
      rotulo: 'Inativar',
      acao: () => {
        void this.inativar(pagamento.id)
      },
    })
  }

  private async inativar(id: number): Promise<void> {
    try {
      await this.servico.inativar(id)
      this.toasts.exibir({
        titulo: 'Pagamento inativado',
        mensagem: 'Registro preservado e marcado como Inativo.',
        tom: 'sucesso',
      })
      this.limparFiltros()
      this.selecionado = null
      this.editandoId = null
      this.original = null
      this.formulario = formularioVazio()
      await this.recarregar()
      this.selecionar(id)
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível inativar',
        mensagem: 'Tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private confirmarBaixa(pagamento: Pagamento): void {
    if (!ehAdministrador() || pagamento.statusPagamento !== 'Pendente') {
      return
    }
    this.confirmar({
      titulo: 'Baixar pagamento',
      mensagem: `Confirmar o recebimento de ${formatadorPtBr.moeda(pagamento.valorTotal)} da reserva #${pagamento.reservaId}?`,
      rotulo: 'Baixar',
      acao: () => {
        void (async () => {
          try {
            await this.servico.atualizar({
              id: pagamento.id,
              statusPagamento: 'Pago',
              formaPagamento: pagamento.formaPagamento ?? 'Pix',
              dataPagamento: new Date().toISOString(),
            })
            this.toasts.exibir({
              titulo: 'Pagamento baixado',
              mensagem: 'Status atualizado para pago.',
              tom: 'sucesso',
            })
            await this.recarregar()
          } catch {
            this.toasts.exibir({
              titulo: 'Não foi possível baixar',
              mensagem: 'Tente novamente em instantes.',
              tom: 'erro',
            })
          }
        })()
      },
    })
  }

  private confirmarEstorno(pagamento: Pagamento): void {
    if (!ehAdministrador() || pagamento.statusPagamento !== 'Pago') {
      return
    }
    this.confirmar({
      titulo: 'Estornar pagamento',
      mensagem: `Estornar ${formatadorPtBr.moeda(pagamento.valorTotal)} da reserva #${pagamento.reservaId}?`,
      rotulo: 'Estornar',
      acao: () => {
        void (async () => {
          try {
            await this.servico.atualizar({ id: pagamento.id, statusPagamento: 'Estornado' })
            this.toasts.exibir({
              titulo: 'Pagamento estornado',
              mensagem: 'Status atualizado para estornado.',
              tom: 'sucesso',
            })
            await this.recarregar()
          } catch {
            this.toasts.exibir({
              titulo: 'Não foi possível estornar',
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
      id: 'pagamentos-confirmacao',
      titulo: opcoes.titulo,
      conteudo: criarElemento('p', { className: CLASSES.leituraLinha, texto: opcoes.mensagem }),
      rodape: [cancelar.raiz, confirmar.raiz],
      aoFechar: () => {
        this.modal = null
      },
    })
    this.modal = modal
    modal.abrir()
  }
}
