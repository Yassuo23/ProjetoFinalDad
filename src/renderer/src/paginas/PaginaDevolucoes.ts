import type {
  Cliente,
  Devolucao,
  DevolucaoAtualizarEntrada,
  EstadoPosUso,
  Pagamento,
  Reserva,
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
import type { ColunaTabela, VarianteBotao } from '../componentes'
import {
  Componente,
  criarElemento,
  ehAdministrador,
  observarPerfil,
  registrarAtalhos,
  substituirConteudo,
} from '../nucleo'
import {
  ServicoClientes,
  ServicoDevolucoes,
  ServicoPagamentos,
  ServicoReservas,
} from '../servicos'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-3',
  conteudo: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-4',
  bloco: 'flex flex-col gap-2',
  secaoTitulo: 'font-display text-sm font-semibold text-floresta',
  gradeContainer: 'max-w-2xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  leituraLinha: 'mb-2 text-sm text-grafite',
  leituraTitulo: 'font-semibold text-floresta',
  valores: 'rounded-card border border-granito/45 bg-pedra p-3 text-sm text-grafite',
  valorLinha: 'flex items-center justify-between gap-3 py-1',
  aviso: 'rounded-card border border-alerta/40 bg-alerta-suave px-3 py-2 text-xs text-alerta',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  tabelaScroll: 'max-h-72 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  acoes: 'flex flex-wrap items-center gap-1',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'
const ESTADOS: readonly EstadoPosUso[] = ['Perfeito', 'Com avarias leves', 'Danificado']
const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MS_POR_DIA = 86_400_000

interface FormularioDevolucao {
  reservaId: string
  dataEfetiva: string
  estadoPosUso: string
  observacoes: string
}

interface CamposDevolucao {
  reserva: Select
  dataEfetiva: Campo
  estadoPosUso: Select
  observacoes: Campo
}

interface LinhaPendente {
  readonly id: number
  readonly cliente: string
  readonly prevista: string
  readonly status: string
  readonly acoes: string
}

interface LinhaRegistrada {
  readonly id: number
  readonly reserva: number
  readonly cliente: string
  readonly devolvida: string
  readonly conservacao: EstadoPosUso
  readonly prazo: string
  readonly atraso: number
  readonly ativo: boolean
  readonly acoes: string
}

interface Confirmacao {
  readonly titulo: string
  readonly conteudo: Node | string
  readonly rotulo: string
  readonly variante?: VarianteBotao
  readonly permitirAtalho?: boolean
  readonly acao: () => void
}

function formularioVazio(): FormularioDevolucao {
  return { reservaId: '', dataEfetiva: '', estadoPosUso: 'Perfeito', observacoes: '' }
}

function formularioDe(devolucao: Devolucao): FormularioDevolucao {
  return {
    reservaId: String(devolucao.reservaId),
    dataEfetiva: dia(devolucao.dataDevolucaoEfetiva),
    estadoPosUso: devolucao.estadoPosUso,
    observacoes: devolucao.observacoes ?? '',
  }
}

type PatchDevolucao = {
  id: number
  dataDevolucaoEfetiva?: string
  estadoPosUso?: EstadoPosUso
  observacoes?: string | null
}

function moeda(valor: number): string {
  return FORMATADOR_MOEDA.format(valor)
}

function dataLegivel(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor === '') {
    return '—'
  }
  const data = new Date(valor.includes('T') ? valor : `${valor}T12:00:00`)
  if (Number.isNaN(data.getTime())) {
    return '—'
  }
  return data.toLocaleDateString('pt-BR')
}

function dia(valor: string): string {
  return /^\d{4}-\d{2}-\d{2}/.test(valor) ? valor.slice(0, 10) : ''
}

function diasAtraso(dataEfetiva: string, dataFim: string): number {
  const efetiva = dia(dataEfetiva)
  const prevista = dia(dataFim)
  if (efetiva === '' || prevista === '') {
    return 0
  }
  const inicio = Date.parse(`${efetiva}T00:00:00Z`)
  const fim = Date.parse(`${prevista}T00:00:00Z`)
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) {
    return 0
  }
  return Math.max(0, Math.trunc((inicio - fim) / MS_POR_DIA))
}

function ehEstadoPosUso(valor: string): valor is EstadoPosUso {
  return ESTADOS.some((estado) => estado === valor)
}

function badgePrazo(dias: number): Badge {
  return dias > 0
    ? new Badge({ texto: `${dias} dia(s) de atraso`, tom: 'erro' })
    : new Badge({ texto: 'No prazo', tom: 'sucesso' })
}

function badgeAtivo(ativo: boolean): Badge {
  return new Badge({ texto: ativo ? 'Ativo' : 'Inativo', tom: ativo ? 'sucesso' : 'neutro' })
}

const COLUNAS_PENDENTES: readonly ColunaTabela<LinhaPendente>[] = [
  { chave: 'id', rotulo: 'Reserva', ordenavel: true },
  { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
  { chave: 'prevista', rotulo: 'Prevista', ordenavel: true },
  { chave: 'status', rotulo: 'Status' },
]

const COLUNAS_REGISTRADAS: readonly ColunaTabela<LinhaRegistrada>[] = [
  { chave: 'reserva', rotulo: 'Reserva', ordenavel: true },
  { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
  { chave: 'devolvida', rotulo: 'Devolvida', ordenavel: true },
  { chave: 'conservacao', rotulo: 'Conservação' },
  {
    chave: 'prazo',
    rotulo: 'Prazo',
    celula: (linha) => badgePrazo(linha.atraso).raiz,
  },
  {
    chave: 'ativo',
    rotulo: 'Situação',
    celula: (linha) => badgeAtivo(linha.ativo).raiz,
  },
]

export class PaginaDevolucoes extends Componente {
  private readonly servico = new ServicoDevolucoes()
  private readonly servicoReservas = new ServicoReservas()
  private readonly servicoPagamentos = new ServicoPagamentos()
  private readonly servicoClientes = new ServicoClientes()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private clientes: readonly Cliente[] = []
  private devolucoes: readonly Devolucao[] = []
  private reservas: readonly Reserva[] = []
  private pagamentos: readonly Pagamento[] = []
  private formulario: FormularioDevolucao = formularioVazio()
  private campos: CamposDevolucao | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaPendentes: HTMLElement | null = null
  private areaRegistradas: HTMLElement | null = null
  private valoresSlot: HTMLElement | null = null
  private campoBusca: Campo | null = null
  private campoAjuste: Campo | null = null
  private modal: Modal | null = null
  private confirmacaoRapida: (() => void) | null = null
  private selecionadoId: number | null = null
  private editandoId: number | null = null
  private original: Devolucao | null = null
  private busca = ''
  private carregando = true
  private falhaLista: string | null = null

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))

    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => this.novo(),
      aoBuscar: () => this.campoBusca?.focar(),
      aoRecarregar: () => {
        void this.recarregar()
      },
      aoEditar: () => {
        if (ehAdministrador() && this.selecionadoId !== null) {
          void this.editar(this.selecionadoId)
          return
        }
        this.painel?.focarPrimeiroControle()
      },
      aoConfirmar: () => this.aoConfirmar(),
      aoCancelar: () => this.cancelarEdicao(),
      aoConfirmarRapido: () => this.confirmacaoRapida?.(),
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
    this.confirmacaoRapida = null
    this.toasts.destruir()
  }

  private async recarregar(): Promise<void> {
    this.carregando = true
    this.falhaLista = null
    this.montarEstrutura()

    try {
      const incluirInativos = ehAdministrador() ? { incluirInativos: true } : undefined
      const [devolucoes, reservas, pagamentos, clientes] = await Promise.all([
        this.servico.listar(incluirInativos),
        this.servicoReservas.listar(incluirInativos),
        this.servicoPagamentos.listar(incluirInativos),
        this.servicoClientes.listar(incluirInativos),
      ])
      this.devolucoes = [...devolucoes].sort((um, dois) => dois.id - um.id)
      this.reservas = reservas
      this.pagamentos = pagamentos
      this.clientes = clientes
      if (this.selecionadoId !== null && !this.devolucoes.some((item) => item.id === this.selecionadoId)) {
        this.selecionadoId = null
      }
      if (
        this.formulario.reservaId !== '' &&
        !this.pendentes().some((reserva) => String(reserva.id) === this.formulario.reservaId)
      ) {
        this.formulario = formularioVazio()
      }
    } catch {
      this.falhaLista = 'Não foi possível carregar devoluções, reservas e pagamentos. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: this.falhaLista,
        tom: 'erro',
      })
    } finally {
      this.carregando = false
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
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Devoluções' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: admin
                ? 'Registro de devoluções, multas calculadas e ajuste manual do pagamento.'
                : 'Registro de devoluções e acompanhamento de prazos.',
            }),
          ],
        }),
        new Botao({ texto: 'Nova devolução', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.campoBusca = new Campo({
      id: 'devolucoes-busca',
      rotulo: 'Buscar',
      placeholder: 'Reserva, cliente ou conservação',
      icone: ICONE_BUSCA,
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarPendentes()
        this.atualizarRegistradas()
      },
    })
    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [this.campoBusca.raiz],
    })

    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    this.areaPendentes = criarElemento('div', { className: CLASSES.coluna })
    this.areaRegistradas = criarElemento('div', { className: CLASSES.coluna })
    const colunaTabelas = criarElemento('div', {
      className: CLASSES.coluna,
      filhos: [
        criarElemento('div', {
          className: CLASSES.bloco,
          filhos: [
            criarElemento('h3', { className: CLASSES.secaoTitulo, texto: 'Devoluções pendentes' }),
            this.areaPendentes,
          ],
        }),
        criarElemento('div', {
          className: CLASSES.bloco,
          filhos: [
            criarElemento('h3', { className: CLASSES.secaoTitulo, texto: 'Devoluções registradas' }),
            this.areaRegistradas,
          ],
        }),
      ],
    })
    const conteudo = criarElemento('div', {
      className: CLASSES.conteudo,
      filhos: [this.painelSlot, colunaTabelas],
    })

    substituirConteudo(this.elemento, cabecalho, filtros, conteudo)
    this.atualizarPainel()
    this.atualizarPendentes()
    this.atualizarRegistradas()
  }

  private pendentes(): readonly Reserva[] {
    const comDevolucao = new Set(this.devolucoes.map((devolucao) => devolucao.reservaId))
    return this.reservas.filter(
      (reserva) => !comDevolucao.has(reserva.id) && reserva.statusReserva !== 'Cancelada',
    )
  }

  private atualizarPainel(): void {
    if (this.painelSlot === null) {
      return
    }
    const selecionada = this.devolucoes.find((item) => item.id === this.selecionadoId)
    const emEdicao = this.editandoId !== null
    this.valoresSlot = null
    this.campoAjuste = null

    const corpo = this.carregando
      ? criarElemento('div')
      : selecionada === undefined || emEdicao
        ? this.construirFormulario()
        : this.construirLeitura(selecionada)
    const rodape: Node[] = this.carregando
      ? []
      : emEdicao
        ? [
            new Botao({
              texto: 'Cancelar',
              variante: 'secundario',
              aoClicar: () => this.novo(),
            }).raiz,
            new Botao({
              texto: 'Salvar alterações',
              aoClicar: () => this.abrirConfirmacao(),
            }).raiz,
          ]
        : selecionada === undefined
          ? [
              new Botao({
                texto: 'Cancelar',
                variante: 'secundario',
                aoClicar: () => this.cancelarEdicao(),
              }).raiz,
              new Botao({
                texto: 'Calcular multa',
                aoClicar: () => this.abrirConfirmacao(),
              }).raiz,
            ]
          : [
              new Botao({
                texto: 'Nova devolução',
                aoClicar: () => this.novo(),
              }).raiz,
            ]

    this.painel = new PainelFormulario({
      id: 'devolucoes-painel',
      titulo: this.carregando
        ? 'Devoluções'
        : emEdicao
          ? `Editar devolução #${this.editandoId ?? ''}`
          : selecionada === undefined
            ? 'Registrar devolução'
            : `Devolução #${selecionada.id}`,
      corpo,
      rodape,
      carregando: this.carregando,
      desabilitado: this.carregando,
      selecionado: selecionada !== undefined,
      mensagemCarregando: 'Carregando devoluções…',
    })
    this.painelSlot.replaceChildren(this.painel.raiz)
    if (!this.carregando && selecionada !== undefined && !emEdicao) {
      this.atualizarValores(selecionada)
    }
  }

  private construirFormulario(): HTMLElement {
    const estado = this.formulario
    const campos: CamposDevolucao = {
      reserva: new Select({
        id: 'devolucao-reserva',
        rotulo: this.editandoId === null ? 'Reserva pendente' : 'Reserva do registro',
        obrigatorio: this.editandoId === null,
        desabilitado: this.editandoId !== null,
        placeholder: this.editandoId === null ? 'Selecione uma reserva' : undefined,
        valorInicial: estado.reservaId,
        opcoes: this.opcoesReserva(),
        ajuda: this.editandoId === null ? undefined : 'A reserva não pode ser alterada na edição.',
        aoAlterar: (valor) => {
          estado.reservaId = valor
          campos.reserva.definirErro(null)
        },
      }),
      dataEfetiva: new Campo({
        id: 'devolucao-data',
        rotulo: 'Data efetiva',
        tipo: 'date',
        ajuda:
          this.editandoId === null
            ? 'Em branco usa a data atual do sistema.'
            : 'Em branco mantém a data atual do registro.',
        valorInicial: estado.dataEfetiva,
        aoAlterar: (valor) => {
          estado.dataEfetiva = valor
          campos.dataEfetiva.definirErro(null)
        },
      }),
      estadoPosUso: new Select({
        id: 'devolucao-estado',
        rotulo: 'Conservação pós-uso',
        obrigatorio: true,
        valorInicial: estado.estadoPosUso,
        opcoes: ESTADOS.map((estadoPosUso) => ({ valor: estadoPosUso, rotulo: estadoPosUso })),
        aoAlterar: (valor) => {
          estado.estadoPosUso = valor
        },
      }),
      observacoes: new Campo({
        id: 'devolucao-observacoes',
        rotulo: 'Observações',
        placeholder: 'Opcional',
        valorInicial: estado.observacoes,
        aoAlterar: (valor) => {
          estado.observacoes = valor
        },
      }),
    }
    this.campos = campos

    return criarElemento('div', {
      className: CLASSES.gradeContainer,
      filhos: [
        criarElemento('div', {
          className: CLASSES.gradeCampos,
          filhos: [
            campos.reserva.raiz,
            campos.dataEfetiva.raiz,
            campos.estadoPosUso.raiz,
            campos.observacoes.raiz,
          ],
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto:
            this.editandoId === null
              ? 'A multa e o total são calculados pelo sistema no registro; esta tela apenas exibe os valores do pagamento.'
              : 'A edição altera apenas data, conservação e observações. Multa e manutenção não são recalculadas.',
        }),
      ],
    })
  }

  private construirLeitura(devolucao: Devolucao): HTMLElement {
    const reserva = this.reservas.find((item) => item.id === devolucao.reservaId)
    const linhas: Array<Node | string> = [
      this.linhaLeitura('Reserva', `#${devolucao.reservaId}`),
      this.linhaLeitura('Cliente', this.nomeCliente(reserva?.clienteId ?? 0)),
      this.linhaLeitura('Prevista', dataLegivel(reserva?.dataFim)),
      this.linhaLeitura('Devolvida', dataLegivel(devolucao.dataDevolucaoEfetiva)),
      this.linhaLeitura('Conservação', devolucao.estadoPosUso),
      this.linhaLeitura('Observações', devolucao.observacoes?.trim() || '—'),
    ]
    const valores = criarElemento('div', {
      className: CLASSES.valores,
      atributos: { 'aria-live': 'polite' },
    })
    this.valoresSlot = valores
    return criarElemento('div', {
      filhos: [
        ...linhas,
        criarElemento('h3', { className: CLASSES.secaoTitulo, texto: 'Pagamento' }),
        valores,
      ],
    })
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

  private atualizarValores(devolucao: Devolucao): void {
    if (this.valoresSlot === null) {
      return
    }
    this.campoAjuste = null
    const pagamento = this.pagamentoDe(devolucao)
    if (pagamento === undefined) {
      this.valoresSlot.replaceChildren(
        'Pagamento não encontrado para esta reserva. Valores calculados pelo sistema.',
      )
      return
    }

    const filhos: Array<Node | string> = [
      criarElemento('div', {
        className: CLASSES.valorLinha,
        filhos: ['Multa', moeda(pagamento.valorMulta)],
      }),
      criarElemento('div', {
        className: CLASSES.valorLinha,
        filhos: ['Total', moeda(pagamento.valorTotal)],
      }),
      criarElemento('p', {
        className: CLASSES.aviso,
        texto: 'Valores calculados pelo sistema; a baixa é feita em Pagamentos.',
      }),
    ]

    if (ehAdministrador()) {
      const campo = new Campo({
        id: 'devolucao-ajustar-multa',
        rotulo: 'Ajustar multa (R$)',
        tipo: 'number',
        valorInicial: pagamento.valorMulta.toFixed(2),
        ajuda: 'Ajuste manual: não é uma isenção oficial.',
        aoAlterar: (valor) => {
          campo.definirErro(Number.isFinite(Number(valor)) && Number(valor) >= 0 ? null : 'Informe um valor válido.')
        },
      })
      this.campoAjuste = campo
      filhos.push(
        campo.raiz,
        new Botao({
          texto: 'Ajustar valor',
          variante: 'secundario',
          aoClicar: () => this.abrirAjuste(pagamento),
        }).raiz,
      )
    }

    this.valoresSlot.replaceChildren(...filhos)
  }

  private opcoesPendentes(): readonly { readonly valor: string; readonly rotulo: string }[] {
    return this.pendentes().map((item) => ({
      valor: String(item.id),
      rotulo: `#${item.id} · ${this.nomeCliente(item.clienteId)} · prevista ${dataLegivel(item.dataFim)}`,
    }))
  }

  private opcoesReserva(): readonly { readonly valor: string; readonly rotulo: string }[] {
    const pendentes = this.opcoesPendentes()
    if (this.editandoId === null) {
      return pendentes
    }
    const devolucao = this.devolucoes.find((item) => item.id === this.editandoId)
    if (
      devolucao === undefined ||
      pendentes.some((opcao) => opcao.valor === String(devolucao.reservaId))
    ) {
      return pendentes
    }
    return [
      {
        valor: String(devolucao.reservaId),
        rotulo: `#${devolucao.reservaId} · ${this.nomeCliente(this.reservas.find((item) => item.id === devolucao.reservaId)?.clienteId ?? 0)} · registro existente`,
      },
      ...pendentes,
    ]
  }

  private atualizarPendentes(): void {
    if (this.areaPendentes === null) {
      return
    }
    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({
        mensagem: 'Carregando pendências…',
        variante: 'skeleton',
        linhas: 3,
      }).montar(area)
      this.areaPendentes.replaceChildren(area)
      return
    }
    if (this.falhaLista !== null && this.pendentes().length === 0) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.falhaLista,
        aoTentar: () => {
          void this.recarregar()
        },
      }).montar(area)
      this.areaPendentes.replaceChildren(area)
      return
    }

    const filtradas = this.filtrarPendentes()
    if (filtradas.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhuma devolução pendente',
        mensagem: this.busca === '' ? 'Todas as reservas já têm devolução registrada.' : 'Ajuste a busca.',
        acao:
          this.busca === ''
            ? undefined
            : {
                texto: 'Limpar busca',
                aoClicar: () => this.limparBusca(),
              },
      }).montar(area)
      this.areaPendentes.replaceChildren(area)
      return
    }

    const tabela = new Tabela<LinhaPendente>({
      colunas: [
        ...COLUNAS_PENDENTES,
        {
          chave: 'acoes',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoesPendente(linha.id),
        },
      ],
      linhas: filtradas.map((reserva) => this.paraLinhaPendente(reserva)),
      mensagemVazia: 'Nenhuma reserva pendente.',
    })
    const cabecalho = tabela.raiz.querySelector('thead')
    if (cabecalho !== null) {
      cabecalho.className = CLASSES.cabecalhoFixo
    }
    this.areaPendentes.replaceChildren(
      criarElemento('div', { className: CLASSES.tabelaScroll, filhos: [tabela.raiz] }),
    )
  }

  private atualizarRegistradas(): void {
    if (this.areaRegistradas === null) {
      return
    }
    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({
        mensagem: 'Carregando devoluções…',
        variante: 'skeleton',
        linhas: 3,
      }).montar(area)
      this.areaRegistradas.replaceChildren(area)
      return
    }
    if (this.falhaLista !== null && this.devolucoes.length === 0) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.falhaLista,
        aoTentar: () => {
          void this.recarregar()
        },
      }).montar(area)
      this.areaRegistradas.replaceChildren(area)
      return
    }

    const filtradas = this.filtrarRegistradas()
    if (filtradas.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhuma devolução registrada',
        mensagem: 'Registre uma devolução na tabela de pendentes.',
      }).montar(area)
      this.areaRegistradas.replaceChildren(area)
      return
    }

    const tabela = new Tabela<LinhaRegistrada>({
      colunas: [
        ...COLUNAS_REGISTRADAS,
        {
          chave: 'acoes',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoesRegistrada(linha.id),
        },
      ],
      linhas: filtradas.map((devolucao) => this.paraLinhaRegistrada(devolucao)),
      mensagemVazia: 'Nenhuma devolução registrada.',
      aoSelecionar: (linha) => this.selecionar(linha.id),
      linhaSelecionada: (linha) => this.selecionadoId === linha.id,
    })
    const cabecalho = tabela.raiz.querySelector('thead')
    if (cabecalho !== null) {
      cabecalho.className = CLASSES.cabecalhoFixo
    }
    this.areaRegistradas.replaceChildren(
      criarElemento('div', { className: CLASSES.tabelaScroll, filhos: [tabela.raiz] }),
    )
  }

  private paraLinhaPendente(reserva: Reserva): LinhaPendente {
    return {
      id: reserva.id,
      cliente: this.nomeCliente(reserva.clienteId),
      prevista: dataLegivel(reserva.dataFim),
      status: reserva.statusReserva,
      acoes: '',
    }
  }

  private paraLinhaRegistrada(devolucao: Devolucao): LinhaRegistrada {
    const reserva = this.reservas.find((item) => item.id === devolucao.reservaId)
    return {
      id: devolucao.id,
      reserva: devolucao.reservaId,
      cliente: this.nomeCliente(reserva?.clienteId ?? 0),
      devolvida: dataLegivel(devolucao.dataDevolucaoEfetiva),
      conservacao: devolucao.estadoPosUso,
      prazo: '',
      atraso: diasAtraso(devolucao.dataDevolucaoEfetiva, reserva?.dataFim ?? ''),
      ativo: devolucao.ativo,
      acoes: '',
    }
  }

  private criarAcoesPendente(id: number): HTMLElement {
    const container = criarElemento('div', { className: CLASSES.acoes })
    const ver = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Ver reserva',
    })
    ver.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionarPendente(id)
    })
    const registrar = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Registrar',
    })
    registrar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionarPendente(id)
      this.abrirConfirmacao()
    })
    container.append(ver, registrar)
    return container
  }

  private criarAcoesRegistrada(id: number): HTMLElement {
    const container = criarElemento('div', { className: CLASSES.acoes })
    const devolucao = this.devolucoes.find((item) => item.id === id)
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

    if (ehAdministrador() && devolucao !== undefined) {
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

      const inativar = criarElemento('button', {
        className: CLASSES.acaoPerigo,
        atributos: { type: 'button' },
        texto: 'Inativar',
      })
      inativar.disabled = !devolucao.ativo
      inativar.addEventListener('click', (evento) => {
        evento.stopPropagation()
        this.confirmarInativacao(devolucao)
      })
      container.append(inativar)
    }
    return container
  }

  private filtrarPendentes(): readonly Reserva[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    if (termo === '') {
      return this.pendentes()
    }
    return this.pendentes().filter((reserva) =>
      `${reserva.id} ${this.nomeCliente(reserva.clienteId)} ${reserva.statusReserva}`
        .toLocaleLowerCase('pt-BR')
        .includes(termo),
    )
  }

  private filtrarRegistradas(): readonly Devolucao[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    if (termo === '') {
      return this.devolucoes
    }
    return this.devolucoes.filter((devolucao) => {
      const reserva = this.reservas.find((item) => item.id === devolucao.reservaId)
      return `${devolucao.id} ${devolucao.reservaId} ${this.nomeCliente(reserva?.clienteId ?? 0)} ${devolucao.estadoPosUso}`
        .toLocaleLowerCase('pt-BR')
        .includes(termo)
    })
  }

  private limparBusca(): void {
    this.busca = ''
    this.campoBusca?.definirValor('')
    this.atualizarPendentes()
    this.atualizarRegistradas()
  }

  private nomeCliente(id: number): string {
    return this.clientes.find((cliente) => cliente.id === id)?.nome ?? `Cliente ${id}`
  }

  private pagamentoDe(devolucao: Devolucao): Pagamento | undefined {
    return this.pagamentos.find((pagamento) => pagamento.reservaId === devolucao.reservaId)
  }

  private selecionar(id: number): void {
    this.selecionadoId = id
    this.atualizarPainel()
    this.atualizarRegistradas()
  }

  private selecionarPendente(id: number): void {
    const reserva = this.reservas.find((item) => item.id === id)
    if (reserva === undefined) {
      return
    }
    this.selecionadoId = null
    this.formulario.reservaId = String(id)
    this.formulario.estadoPosUso = 'Perfeito'
    this.formulario.observacoes = ''
    this.atualizarPainel()
    this.painel?.focarPrimeiroControle()
  }

  private novo(): void {
    this.formulario = formularioVazio()
    this.selecionadoId = null
    this.editandoId = null
    this.original = null
    this.atualizarPainel()
    this.atualizarRegistradas()
    this.painel?.focarPrimeiroControle()
  }

  private async editar(id: number): Promise<void> {
    if (!ehAdministrador()) {
      this.toasts.exibir({
        mensagem: 'Somente o administrador pode editar devoluções.',
        tom: 'alerta',
      })
      return
    }
    try {
      const devolucao = await this.servico.buscarPorId(id)
      this.original = devolucao
      this.formulario = formularioDe(devolucao)
      this.editandoId = id
      this.selecionadoId = id
      this.atualizarPainel()
      this.atualizarRegistradas()
      this.painel?.focarPrimeiroControle()
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível abrir',
        mensagem: 'Não foi possível carregar esta devolução. Tente novamente.',
        tom: 'erro',
      })
    }
  }

  private async limparEDestacar(id: number): Promise<void> {
    this.formulario = formularioVazio()
    this.selecionadoId = id
    this.editandoId = null
    this.original = null
    this.limparBusca()
    await this.recarregar()
    this.selecionadoId = id
    this.atualizarPainel()
    this.atualizarRegistradas()
  }

  private confirmarInativacao(devolucao: Devolucao): void {
    if (!ehAdministrador() || !devolucao.ativo || this.modal !== null) {
      return
    }
    this.confirmar({
      titulo: 'Inativar devolução',
      conteudo: criarElemento('p', {
        className: CLASSES.leituraLinha,
        texto: `Inativar a devolução #${devolucao.id} da reserva #${devolucao.reservaId}? O registro será preservado e marcado como Inativo.`,
      }),
      rotulo: 'Inativar',
      variante: 'destrutivo',
      acao: () => {
        void this.inativar(devolucao.id)
      },
    })
  }

  private async inativar(id: number): Promise<void> {
    try {
      await this.servico.inativar(id)
      this.toasts.exibir({
        titulo: 'Devolução inativada',
        mensagem: 'Registro preservado e marcado como Inativo.',
        tom: 'sucesso',
      })
      await this.limparEDestacar(id)
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível inativar',
        mensagem: 'Tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private cancelarEdicao(): void {
    if (this.busca !== '') {
      this.limparBusca()
      return
    }
    this.novo()
  }

  private aoConfirmar(): void {
    if (this.selecionadoId !== null && ehAdministrador() && this.campoAjuste !== null) {
      const devolucao = this.devolucoes.find((item) => item.id === this.selecionadoId)
      const pagamento = devolucao === undefined ? undefined : this.pagamentoDe(devolucao)
      if (pagamento !== undefined) {
        this.abrirAjuste(pagamento)
        return
      }
    }
    this.abrirConfirmacao()
  }

  private validar(): boolean {
    if (this.editandoId === null) {
      const reservaId = Number(this.formulario.reservaId)
      const reserva = this.pendentes().find((item) => item.id === reservaId)
      if (!Number.isSafeInteger(reservaId) || reserva === undefined) {
        this.campos?.reserva.definirErro('Selecione uma reserva pendente.')
        return false
      }
    }
    this.campos?.reserva.definirErro(null)

    if (!ehEstadoPosUso(this.formulario.estadoPosUso)) {
      return false
    }
    if (this.formulario.dataEfetiva !== '') {
      const data = new Date(`${this.formulario.dataEfetiva}T12:00:00Z`)
      if (Number.isNaN(data.getTime())) {
        this.campos?.dataEfetiva.definirErro('Informe uma data válida.')
        return false
      }
    }
    this.campos?.dataEfetiva.definirErro(null)
    return true
  }

  private abrirConfirmacao(): void {
    if (this.modal !== null) {
      return
    }
    if (this.editandoId !== null) {
      this.abrirConfirmacaoEdicao()
      return
    }
    if (!this.validar()) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Revise a devolução',
        mensagem: 'Confira os campos destacados antes de registrar.',
        tom: 'alerta',
      })
      return
    }
    this.painel?.definirErro(false)
    const reserva = this.pendentes().find(
      (item) => item.id === Number(this.formulario.reservaId),
    )
    const conteudo = criarElemento('div', {
      filhos: [
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Reserva #${this.formulario.reservaId} de ${this.nomeCliente(reserva?.clienteId ?? 0)}.`,
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto: 'O sistema calculará atraso, multa e total no registro. A baixa continua em Pagamentos.',
        }),
      ],
    })
    this.confirmar({
      titulo: 'Registrar devolução',
      conteudo,
      rotulo: 'Registrar devolução',
      permitirAtalho: true,
      acao: () => {
        void this.salvar()
      },
    })
  }

  private patchEdicao(): PatchDevolucao | null {
    const original = this.original
    if (original === null) {
      return null
    }
    const anterior = formularioDe(original)
    const patch: PatchDevolucao = { id: original.id }
    if (
      this.formulario.dataEfetiva !== '' &&
      this.formulario.dataEfetiva !== anterior.dataEfetiva
    ) {
      patch.dataDevolucaoEfetiva = new Date(`${this.formulario.dataEfetiva}T12:00:00Z`).toISOString()
    }
    if (
      ehEstadoPosUso(this.formulario.estadoPosUso) &&
      this.formulario.estadoPosUso !== anterior.estadoPosUso
    ) {
      patch.estadoPosUso = this.formulario.estadoPosUso
    }
    const observacoes = this.formulario.observacoes.trim()
    if (observacoes !== (original.observacoes ?? '')) {
      patch.observacoes = observacoes === '' ? null : observacoes
    }
    return Object.keys(patch).length > 1 ? patch : null
  }

  private abrirConfirmacaoEdicao(): void {
    if (this.editandoId === null || !ehAdministrador()) {
      return
    }
    if (!this.validar()) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Revise a devolução',
        mensagem: 'Confira os campos destacados antes de salvar.',
        tom: 'alerta',
      })
      return
    }
    this.painel?.definirErro(false)
    const patch = this.patchEdicao()
    if (patch === null) {
      this.toasts.exibir({
        titulo: 'Nenhuma alteração',
        mensagem: 'Os valores já estavam salvos.',
        tom: 'informacao',
      })
      return
    }
    const conteudo = criarElemento('div', {
      filhos: [
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Devolução #${patch.id} da reserva #${this.formulario.reservaId}.`,
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto: 'Multa, total e manutenção dos equipamentos não serão recalculados nesta edição.',
        }),
      ],
    })
    this.confirmar({
      titulo: 'Salvar alterações da devolução',
      conteudo,
      rotulo: 'Salvar alterações',
      permitirAtalho: true,
      acao: () => {
        void this.salvarEdicao(patch)
      },
    })
  }

  private async salvarEdicao(patch: PatchDevolucao): Promise<void> {
    const entrada: DevolucaoAtualizarEntrada = patch
    try {
      await this.servico.atualizar(entrada)
      this.toasts.exibir({
        titulo: 'Devolução atualizada',
        mensagem: `Devolução #${patch.id} atualizada. Valores calculados preservados.`,
        tom: 'sucesso',
      })
      await this.limparEDestacar(patch.id)
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: 'Verifique os dados e tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private async salvar(): Promise<void> {
    const estado = ehEstadoPosUso(this.formulario.estadoPosUso)
      ? this.formulario.estadoPosUso
      : 'Perfeito'
    const observacoes = this.formulario.observacoes.trim()
    const dados = {
      reservaId: Number(this.formulario.reservaId),
      estadoPosUso: estado,
      ...(this.formulario.dataEfetiva === ''
        ? {}
        : { dataDevolucaoEfetiva: new Date(`${this.formulario.dataEfetiva}T12:00:00Z`).toISOString() }),
      ...(observacoes === '' ? {} : { observacoes }),
    }

    try {
      await this.servico.criar(dados)
      await this.recarregar()
      this.toasts.exibir({
        titulo: 'Devolução registrada',
        mensagem: 'Multa e total calculados pelo sistema e exibidos no pagamento da reserva.',
        tom: 'sucesso',
      })
      this.novo()
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível registrar',
        mensagem: 'Verifique os dados e tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private abrirAjuste(pagamento: Pagamento): void {
    if (!ehAdministrador() || this.campoAjuste === null) {
      return
    }
    const valor = Number(this.campoAjuste.valor())
    if (!Number.isFinite(valor) || valor < 0) {
      this.campoAjuste.definirErro('Informe um valor de multa válido.')
      this.toasts.exibir({
        titulo: 'Revise o valor',
        mensagem: 'Informe um valor maior ou igual a zero.',
        tom: 'alerta',
      })
      return
    }
    this.campoAjuste.definirErro(null)

    const conteudo = criarElemento('div', {
      filhos: [
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Multa atual: ${moeda(pagamento.valorMulta)}. Nova multa: ${moeda(valor)}.`,
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto: 'Ajuste manual, não isenção oficial. O contrato atual não recalcula automaticamente o total após o ajuste.',
        }),
      ],
    })
    this.confirmar({
      titulo: 'Ajustar multa',
      conteudo,
      rotulo: 'Ajustar valor',
      variante: 'destrutivo',
      permitirAtalho: true,
      acao: () => {
        void this.ajustar(pagamento.id, valor)
      },
    })
  }

  private async ajustar(pagamentoId: number, valorMulta: number): Promise<void> {
    try {
      await this.servicoPagamentos.atualizar({ id: pagamentoId, valorMulta })
      await this.recarregar()
      this.toasts.exibir({
        titulo: 'Ajuste registrado',
        mensagem: 'Ajuste manual aplicado; não é uma isenção oficial.',
        tom: 'alerta',
      })
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível ajustar',
        mensagem: 'Tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private confirmar(opcoes: Confirmacao): void {
    if (this.modal !== null) {
      return
    }
    let executado = false
    const executar = (): void => {
      if (executado) {
        return
      }
      executado = true
      this.modal?.fechar()
      opcoes.acao()
    }
    this.confirmacaoRapida = opcoes.permitirAtalho === true ? executar : null

    const cancelar = new Botao({
      texto: 'Voltar',
      variante: 'secundario',
      aoClicar: () => this.modal?.fechar(),
    })
    const confirmar = new Botao({
      texto: opcoes.rotulo,
      variante: opcoes.variante ?? 'primario',
      aoClicar: executar,
    })
    const modal = new Modal({
      id: 'devolucoes-confirmacao',
      titulo: opcoes.titulo,
      conteudo: opcoes.conteudo,
      rodape: [cancelar.raiz, confirmar.raiz],
      aoFechar: () => {
        this.modal = null
        this.confirmacaoRapida = null
      },
    })
    this.modal = modal
    modal.abrir()
  }
}
