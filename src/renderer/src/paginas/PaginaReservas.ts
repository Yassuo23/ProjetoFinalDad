import type {
  CategoriaEquipamento,
  Cliente,
  Equipamento,
  ItemReservaEntrada,
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  StatusReserva,
} from '../../../shared/contratos/modelos'
import {
  AreaToast,
  Badge,
  Botao,
  Campo,
  Carregando,
  EstadoErro,
  EstadoVazio,
  ListaSelecionavel,
  Modal,
  PainelFormulario,
  Select,
  Tabela,
} from '../componentes'
import type { ColunaTabela, OpcaoListaSelecionavel, TomToast, VarianteBotao } from '../componentes'
import {
  Componente,
  clienteVinculado,
  criarElemento,
  ehAdministrador,
  idClienteVinculado,
  observarPerfil,
  registrarAtalhos,
  sessaoAtiva,
  substituirConteudo,
} from '../nucleo'
import {
  EquipamentoServico,
  ServicoClientes,
  ServicoItensReserva,
  ServicoReservas,
} from '../servicos'
import { formatadorPtBr } from '../util'

type ModoReservas = 'consulta' | 'novo'

export interface OpcoesPaginaReservas {
  /**
   * Modo cliente: sem seleção de cliente, sem tabela administrativa e sem
   * consulta a `categorias:*` (categorias são domínio fechado no contrato).
   */
  readonly modoCliente?: boolean
}

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  conteudo: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoFormulario: 'mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  formularioColuna: 'flex min-h-0 min-w-0 flex-col',
  gradeContainer: 'max-w-3xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  grupoCliente: 'flex flex-col gap-2',
  secao: 'mt-5 border-t border-granito/30 pt-4',
  secaoTopo: 'mb-3 flex flex-wrap items-center justify-between gap-2',
  secaoTitulo: 'font-display text-sm font-semibold text-floresta',
  filtros:
    'grid grid-cols-1 gap-3 rounded-card border border-granito/45 bg-superficie p-4 shadow-card md:grid-cols-2 xl:grid-cols-4',
  detalhes:
    'flex h-full min-h-0 flex-col gap-3 rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  detalhesTitulo: 'font-display text-lg text-floresta',
  detalhesLinha:
    'flex items-center justify-between gap-3 border-b border-granito/30 py-2 text-sm last:border-0',
  detalhesRotulo: 'text-floresta/70',
  detalhesValor: 'text-right font-semibold text-grafite',
  detalhesAcoes: 'flex flex-wrap gap-2 pt-2',
  resumo: 'min-h-16 rounded-card border border-granito/45 bg-pedra p-3 text-sm text-grafite',
  linhaResumo: 'mb-2 text-sm text-grafite',
  leituraLinha: 'mb-2 text-sm text-grafite',
  leituraTitulo: 'font-semibold text-floresta',
  total:
    'mt-2 flex items-center justify-between gap-3 border-t border-granito/30 pt-2 font-semibold text-floresta',
  aviso: 'rounded-card border border-alerta/40 bg-alerta-suave px-3 py-2 text-xs text-alerta',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  acoes: 'flex flex-wrap items-center gap-1',
  acao: 'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  rodapeFormulario: 'flex w-full flex-wrap items-center justify-between gap-3',
  botoesRodape: 'flex flex-wrap items-center justify-end gap-2',
  motivo: 'max-w-md text-xs text-floresta/70',
  motivoAlerta: 'max-w-md text-xs font-semibold text-alerta',
  cartaoReserva:
    'flex w-full flex-col gap-2 rounded-card border border-granito/45 bg-superficie p-4 text-left shadow-card transition-colors motion-reduce:transition-none hover:border-floresta/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  cartaoReservaAtivo:
    'flex w-full flex-col gap-2 rounded-card border border-lima bg-superficie p-4 text-left shadow-card transition-colors motion-reduce:transition-none hover:border-floresta/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  cartaoTitulo: 'font-semibold text-floresta',
  cartaoLinha: 'text-sm text-grafite',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'
const CATEGORIAS: readonly CategoriaEquipamento[] = ['Bicicleta', 'Caiaque', 'Prancha', 'Camping']
const STATUS: readonly StatusReserva[] = ['Pendente', 'Confirmada', 'Cancelada', 'Concluída']
const MS_POR_DIA = 86_400_000
const ATRASO_DISPONIBILIDADE_MS = 250

interface FormularioReserva {
  buscaCliente: string
  clienteId: string
  dataInicio: string
  dataFim: string
  categoria: string
}

interface FiltrosConsulta {
  cliente: string
  status: string
  inicio: string
  fim: string
}

interface CamposReserva {
  buscaCliente: Campo
  cliente: Select
  dataInicio: Campo
  dataFim: Campo
  categoria: Select
}

interface RascunhoReservas {
  readonly formulario: FormularioReserva
  readonly itens: readonly (readonly [number, number])[]
}

interface MensagemDestaque {
  readonly titulo: string
  readonly texto: string
  readonly tom: TomToast
}

interface DestaqueReservas {
  readonly id: number
  readonly mensagem: MensagemDestaque
}

interface MemoriaReservas {
  rascunho: RascunhoReservas | null
  edicaoId: number | null
  destaque: DestaqueReservas | null
}

interface LinhaReserva {
  readonly id: number
  readonly cliente: string
  readonly inicio: string
  readonly fim: string
  readonly status: StatusReserva
  readonly previsao: string
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

/** Estado de passagem entre rotas: o roteador recria a página a cada hash. */
const memoria: MemoriaReservas = { rascunho: null, edicaoId: null, destaque: null }

function guardarRascunho(rascunho: RascunhoReservas): void {
  memoria.rascunho = rascunho
}

function consumirRascunho(): RascunhoReservas | null {
  const atual = memoria.rascunho
  memoria.rascunho = null
  return atual
}

function limparRascunho(): void {
  memoria.rascunho = null
}

function guardarEdicao(id: number): void {
  memoria.edicaoId = id
}

function consumirEdicao(): number | null {
  const atual = memoria.edicaoId
  memoria.edicaoId = null
  return atual
}

function guardarDestaque(destaque: DestaqueReservas): void {
  memoria.destaque = destaque
}

function consumirDestaque(): DestaqueReservas | null {
  const atual = memoria.destaque
  memoria.destaque = null
  return atual
}

function formularioVazio(): FormularioReserva {
  return { buscaCliente: '', clienteId: '', dataInicio: '', dataFim: '', categoria: '' }
}

function filtrosVazios(): FiltrosConsulta {
  return { cliente: '', status: '', inicio: '', fim: '' }
}

function diasEntre(inicio: string, fim: string): number {
  const inicioMs = Date.parse(`${inicio}T00:00:00Z`)
  const fimMs = Date.parse(`${fim}T00:00:00Z`)
  if (!Number.isFinite(inicioMs) || !Number.isFinite(fimMs)) {
    return 0
  }
  return Math.max(1, Math.trunc((fimMs - inicioMs) / MS_POR_DIA) + 1)
}

function ehCategoriaEquipamento(valor: string): valor is CategoriaEquipamento {
  return CATEGORIAS.some((categoria) => categoria === valor)
}

function ehStatusReserva(valor: string): valor is StatusReserva {
  return STATUS.some((status) => status === valor)
}

function badgeStatus(status: StatusReserva): Badge {
  const tom =
    status === 'Confirmada'
      ? 'sucesso'
      : status === 'Cancelada'
        ? 'erro'
        : status === 'Concluída'
          ? 'escuro'
          : 'alerta'
  return new Badge({ texto: status, tom })
}

function badgeAtivo(ativo: boolean): Badge {
  return new Badge({ texto: ativo ? 'Ativo' : 'Inativo', tom: ativo ? 'sucesso' : 'neutro' })
}

const COLUNAS_BASE: readonly ColunaTabela<LinhaReserva>[] = [
  { chave: 'id', rotulo: 'Reserva', ordenavel: true },
  { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
  { chave: 'inicio', rotulo: 'Início', ordenavel: true },
  { chave: 'fim', rotulo: 'Fim', ordenavel: true },
  {
    chave: 'status',
    rotulo: 'Status',
    celula: (linha) => badgeStatus(linha.status).raiz,
  },
  { chave: 'previsao', rotulo: 'Previsão' },
  {
    chave: 'ativo',
    rotulo: 'Situação',
    celula: (linha) => badgeAtivo(linha.ativo).raiz,
  },
]

export class PaginaReservas extends Componente {
  private readonly servico = new ServicoReservas()
  private readonly servicoItens = new ServicoItensReserva()
  private readonly servicoClientes = new ServicoClientes()
  private readonly servicoEquipamentos = new EquipamentoServico()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private itens = new Map<number, number>()
  private readonly catalogoItens = new Map<number, Equipamento>()
  private readonly diariasInvalidas = new Set<number>()
  private clientes: readonly Cliente[] = []
  private reservas: readonly Reserva[] = []
  private categorias: readonly CategoriaEquipamento[] = []
  private disponiveis: readonly Equipamento[] = []
  private formulario: FormularioReserva = formularioVazio()
  private filtros: FiltrosConsulta = filtrosVazios()
  private campos: CamposReserva | null = null
  private lista: ListaSelecionavel<Equipamento> | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null
  private tabelaSlot: HTMLElement | null = null
  private areaDetalhes: HTMLElement | null = null
  private clientesSlot: HTMLElement | null = null
  private equipamentosSlot: HTMLElement | null = null
  private resumoSlot: HTMLElement | null = null
  private totalSlot: HTMLElement | null = null
  private motivoSlot: HTMLElement | null = null
  private botaoConfirmar: Botao | null = null
  private campoFiltroCliente: Campo | null = null
  private modal: Modal | null = null
  private confirmacaoRapida: (() => void) | null = null
  private selecionadoId: number | null = null
  private editandoId: number | null = null
  private destaquePendente: DestaqueReservas | null = null
  private timerDisponibilidade: number | null = null
  private requisicaoDisponibilidade = 0
  private carregando = true
  private clientesCarregando = true
  private clientesErro: string | null = null
  private falhaLista: string | null = null
  private falhaEdicao: string | null = null
  private disponibilidadeCarregando = false
  private disponibilidadeErro: string | null = null
  private consultaFeita = false
  private preservarAoDesmontar = true

  constructor(
    private readonly modo: ModoReservas = 'consulta',
    private readonly opcoes: OpcoesPaginaReservas = {},
  ) {
    super(criarElemento('section', { className: CLASSES.pagina }))

    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => {
        if (this.modo === 'novo') {
          this.limparFormulario()
          return
        }
        this.irParaNovo()
      },
      aoBuscar: () => {
        if (this.modo === 'novo') {
          this.campos?.buscaCliente.focar()
          return
        }
        this.campoFiltroCliente?.focar()
      },
      aoRecarregar: () => {
        void this.recarregar()
      },
      aoEditar: () => {
        if (this.modo === 'consulta' && this.selecionadoId !== null) {
          this.irParaEdicao(this.selecionadoId)
          return
        }
        this.painel?.focarPrimeiroControle()
      },
      aoConfirmar: () => {
        if (this.modo === 'novo') {
          this.abrirConfirmacao()
        }
      },
      aoCancelar: () => this.cancelarEdicao(),
      aoConfirmarRapido: () => this.confirmacaoRapida?.(),
      emCampo: () => this.modo === 'novo',
      modalAberto: () => this.modal !== null,
    })
    this.cancelarPerfil = observarPerfil(() => this.montarEstrutura())
  }

  private get modoCliente(): boolean {
    return this.opcoes.modoCliente === true
  }

  protected aoMontar(): void {
    this.toasts.montarFilho(document.body)
    const edicao = consumirEdicao()
    if (edicao !== null) {
      this.editandoId = edicao
    }
    const rascunho = consumirRascunho()
    if (rascunho !== null && this.editandoId === null && this.modo === 'novo') {
      this.formulario = { ...rascunho.formulario }
      this.itens = new Map(rascunho.itens.map(([id, valor]) => [id, valor]))
    }
    this.destaquePendente = consumirDestaque()
    this.montarEstrutura()

    void (async () => {
      await this.carregarDados()
      if (this.modo === 'novo' && this.editandoId !== null) {
        await this.editar(this.editandoId)
      }
      this.aplicarDestaquePendente()
    })()
  }

  protected aoDesmontar(): void {
    this.cancelarTimer()
    this.requisicaoDisponibilidade += 1
    if (this.modo === 'novo' && this.editandoId === null && this.preservarAoDesmontar) {
      this.guardarRascunho()
    }
    this.cancelarAtalhos()
    this.cancelarPerfil()
    this.modal?.fechar()
    this.modal = null
    this.confirmacaoRapida = null
    this.toasts.destruir()
  }

  private async carregarDados(): Promise<void> {
    this.carregando = true
    this.montarEstrutura()
    const tarefas: Array<Promise<void>> = []
    if (this.modoCliente) {
      this.clientes = []
      this.clientesCarregando = false
      this.clientesErro = null
      this.categorias = CATEGORIAS
    } else {
      tarefas.push(this.carregarClientes(false), this.carregarCategorias())
    }
    if (this.modo === 'consulta') {
      tarefas.push(this.carregarReservas())
    }
    await Promise.all(tarefas)
    this.carregando = false
    this.montarEstrutura()
  }

  private async recarregar(): Promise<void> {
    await this.carregarDados()
  }

  private async carregarClientes(renderizar: boolean): Promise<void> {
    if (this.modoCliente) {
      return
    }
    this.clientesCarregando = true
    this.clientesErro = null
    if (renderizar) {
      this.renderizarClientes()
      this.atualizarMotivo()
    }
    try {
      const filtros = ehAdministrador() ? { incluirInativos: true } : undefined
      this.clientes = await this.servicoClientes.listar(filtros)
    } catch {
      this.clientes = []
      this.clientesErro = 'Não foi possível carregar os clientes. Tente novamente.'
    } finally {
      this.clientesCarregando = false
      if (renderizar) {
        this.renderizarClientes()
        this.atualizarMotivo()
      }
    }
  }

  private async carregarReservas(): Promise<void> {
    this.falhaLista = null
    try {
      const filtros = ehAdministrador() ? { incluirInativos: true } : undefined
      const reservas = await this.servico.listar(filtros)
      this.reservas = [...reservas].sort((um, dois) => dois.id - um.id)
      if (
        this.selecionadoId !== null &&
        !this.reservas.some((item) => item.id === this.selecionadoId)
      ) {
        this.selecionadoId = null
      }
    } catch {
      this.falhaLista = 'Não foi possível carregar as reservas. Tente novamente.'
    }
  }

  private async carregarCategorias(): Promise<void> {
    try {
      const resultado = await this.servicoEquipamentos.listarCategorias()
      this.categorias = resultado.itens
        .map((categoria) => categoria.nome)
        .filter(ehCategoriaEquipamento)
      if (resultado.dadosDeExemplo) {
        this.toasts.exibir({
          titulo: 'Categorias temporárias',
          mensagem: 'Não foi possível carregar as categorias; opções de exemplo estão em uso.',
          tom: 'alerta',
        })
      }
    } catch {
      this.categorias = []
    }
  }

  private montarEstrutura(): void {
    this.painel = null
    this.painelSlot = null
    this.areaTabela = null
    this.tabelaSlot = null
    this.areaDetalhes = null
    this.clientesSlot = null
    this.equipamentosSlot = null
    this.resumoSlot = null
    this.totalSlot = null
    this.motivoSlot = null
    this.botaoConfirmar = null
    this.campoFiltroCliente = null
    if (this.modo === 'consulta') {
      this.campos = null
      this.lista = null
    }

    const editando = this.modo === 'novo' && this.editandoId !== null
    const titulo =
      this.modo === 'novo'
        ? editando
          ? `Editar reserva #${this.editandoId ?? ''}`
          : 'Nova reserva'
        : 'Reservas'
    const subtitulo = this.modoCliente
      ? this.modo === 'novo'
        ? 'Escolha o período e os equipamentos antes de confirmar.'
        : 'Acompanhe suas reservas, equipamentos e previsão do tempo.'
      : this.modo === 'novo'
        ? 'Escolha cliente, período e equipamentos antes de confirmar.'
        : ehAdministrador()
          ? 'Consulte, confirme, cancele e edite as locações.'
          : 'Consulte as locações e seus equipamentos.'

    const acoes: Array<Node> =
      this.modo === 'novo'
        ? [
            new Botao({
              texto: this.modoCliente ? 'Voltar às minhas reservas' : 'Voltar à consulta',
              variante: 'secundario',
              aoClicar: () => this.irParaConsulta(),
            }).raiz,
          ]
        : [
            new Botao({
              texto: 'Recarregar',
              variante: 'secundario',
              aoClicar: () => {
                void this.recarregar()
              },
            }).raiz,
            new Botao({ texto: 'Nova reserva', aoClicar: () => this.irParaNovo() }).raiz,
          ]

    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: titulo }),
            criarElemento('p', { className: CLASSES.subtitulo, texto: subtitulo }),
          ],
        }),
        criarElemento('div', { className: CLASSES.botoesRodape, filhos: acoes }),
      ],
    })

    if (this.modo === 'novo') {
      this.painelSlot = criarElemento('div', { className: CLASSES.formularioColuna })
      substituirConteudo(
        this.elemento,
        cabecalho,
        criarElemento('div', {
          className: CLASSES.conteudoFormulario,
          filhos: [this.painelSlot],
        }),
      )
      this.atualizarPainel()
      return
    }

    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.tabelaSlot = criarElemento('div', { className: CLASSES.coluna })
    this.areaDetalhes = criarElemento('div', { className: CLASSES.coluna })
    this.areaTabela.append(this.criarFiltros(), this.tabelaSlot)
    substituirConteudo(
      this.elemento,
      cabecalho,
      criarElemento('div', {
        className: CLASSES.conteudo,
        filhos: [this.areaTabela, this.areaDetalhes],
      }),
    )
    this.atualizarTabela()
    this.atualizarDetalhes()
  }

  private atualizarPainel(): void {
    if (this.painelSlot === null) {
      return
    }

    const editando = this.editandoId !== null
    const confirmar = new Botao({
      texto: editando ? 'Salvar alterações' : 'Confirmar reserva',
      id: 'reservas-confirmar',
      aoClicar: () => this.abrirConfirmacao(),
    })
    confirmar.raiz.setAttribute('aria-describedby', 'reservas-confirmar-motivo')
    this.botaoConfirmar = confirmar
    this.motivoSlot = criarElemento('p', {
      className: CLASSES.motivo,
      atributos: { id: 'reservas-confirmar-motivo', 'aria-live': 'polite' },
    })

    const rodape = criarElemento('div', {
      className: CLASSES.rodapeFormulario,
      filhos: [
        this.motivoSlot,
        criarElemento('div', {
          className: CLASSES.botoesRodape,
          filhos: [
            new Botao({
              texto: editando ? 'Cancelar edição' : 'Limpar',
              variante: 'secundario',
              aoClicar: () => this.cancelarEdicao(),
            }).raiz,
            confirmar.raiz,
          ],
        }),
      ],
    })

    const mensagemCarregamento = this.modoCliente
      ? 'Carregando o formulário…'
      : 'Carregando clientes e categorias…'
    let corpo: Node = this.construirFormulario()
    if (this.carregando) {
      corpo = new Carregando({
        mensagem: mensagemCarregamento,
        variante: 'skeleton',
        linhas: 4,
      }).raiz
    } else if (this.falhaEdicao !== null) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.falhaEdicao,
        aoTentar: () => {
          void this.editar(this.editandoId ?? 0)
        },
      }).montar(area)
      corpo = area
    }

    this.painel = new PainelFormulario({
      id: 'reservas-painel',
      titulo: editando ? `Editar reserva #${this.editandoId ?? ''}` : 'Nova reserva',
      corpo,
      rodape: this.carregando || this.falhaEdicao !== null ? [] : [rodape],
      carregando: this.carregando,
      desabilitado: this.carregando || this.falhaEdicao !== null,
      mensagemCarregando: mensagemCarregamento,
    })
    this.painelSlot.replaceChildren(this.painel.raiz)
    if (!this.carregando && this.falhaEdicao === null) {
      this.atualizarOpcoesCliente()
      this.renderizarClientes()
      this.renderizarEquipamentos()
      this.atualizarResumo()
      this.atualizarMotivo()
    } else {
      this.botaoConfirmar.definirDesabilitado(true)
    }
  }

  private construirFormulario(): HTMLElement {
    const estado = this.formulario
    const campos: CamposReserva = {
      cliente: new Select({
        id: 'reserva-cliente',
        rotulo: 'Cliente',
        obrigatorio: true,
        placeholder: 'Selecione um cliente',
        valorInicial: estado.clienteId,
        opcoes: this.opcoesCliente(),
        aoAlterar: (valor) => {
          estado.clienteId = valor
          campos.cliente.definirErro(null)
          this.atualizarMotivo()
        },
      }),
      buscaCliente: new Campo({
        id: 'reserva-cliente-busca',
        rotulo: 'Buscar cliente',
        placeholder: 'Nome ou CPF',
        icone: ICONE_BUSCA,
        valorInicial: estado.buscaCliente,
        aoAlterar: (valor) => {
          estado.buscaCliente = valor
          this.atualizarOpcoesCliente()
        },
      }),
      dataInicio: new Campo({
        id: 'reserva-inicio',
        rotulo: 'Data de início',
        tipo: 'date',
        obrigatorio: true,
        valorInicial: estado.dataInicio,
        aoAlterar: (valor) => {
          estado.dataInicio = valor
          campos.dataInicio.definirErro(null)
          this.atualizarResumo()
          this.agendarDisponibilidade()
        },
      }),
      dataFim: new Campo({
        id: 'reserva-fim',
        rotulo: 'Data de fim',
        tipo: 'date',
        obrigatorio: true,
        valorInicial: estado.dataFim,
        aoAlterar: (valor) => {
          estado.dataFim = valor
          campos.dataFim.definirErro(null)
          this.atualizarResumo()
          this.agendarDisponibilidade()
        },
      }),
      categoria: new Select({
        id: 'reserva-categoria',
        rotulo: 'Categoria',
        placeholder: 'Todas',
        valorInicial: estado.categoria,
        opcoes: this.categorias.map((categoria) => ({ valor: categoria, rotulo: categoria })),
        aoAlterar: (valor) => {
          estado.categoria = valor
          this.renderizarEquipamentos()
        },
      }),
    }
    this.campos = campos

    this.clientesSlot = criarElemento('div')
    this.equipamentosSlot = criarElemento('div')
    this.resumoSlot = criarElemento('div', {
      className: CLASSES.resumo,
      atributos: { 'aria-live': 'polite' },
    })

    if (this.modoCliente) {
      const id = idClienteVinculado()
      this.clientesSlot.replaceChildren(
        criarElemento('div', {
          className: CLASSES.grupoCliente,
          filhos: [
            criarElemento('p', {
              className: CLASSES.motivo,
              texto: `Reserva em nome de ${sessaoAtiva()?.nome ?? 'você'}.`,
            }),
            criarElemento('p', {
              className: CLASSES.motivo,
              texto:
                id === null
                  ? 'Sua conta ainda não está vinculada a um cliente. Fale com a loja.'
                  : 'Você não precisa informar o cliente; o sistema usa sua conta.',
            }),
          ],
        }),
      )
    }

    return criarElemento('div', {
      className: CLASSES.gradeContainer,
      filhos: [
        criarElemento('div', {
          className: CLASSES.gradeCampos,
          filhos: [
            this.clientesSlot,
            campos.dataInicio.raiz,
            campos.dataFim.raiz,
            campos.categoria.raiz,
          ],
        }),
        criarElemento('div', {
          className: CLASSES.secao,
          filhos: [
            criarElemento('div', {
              className: CLASSES.secaoTopo,
              filhos: [
                criarElemento('h3', {
                  className: CLASSES.secaoTitulo,
                  texto: 'Equipamentos disponíveis',
                }),
              ],
            }),
            this.equipamentosSlot,
          ],
        }),
        criarElemento('div', {
          className: CLASSES.secao,
          filhos: [
            criarElemento('h3', { className: CLASSES.secaoTitulo, texto: 'Resumo' }),
            this.resumoSlot,
          ],
        }),
      ],
    })
  }

  private renderizarClientes(): void {
    if (this.modoCliente || this.clientesSlot === null || this.campos === null) {
      return
    }
    if (this.carregando || this.clientesCarregando) {
      this.clientesSlot.replaceChildren(new Carregando({ mensagem: 'Carregando clientes…' }).raiz)
      return
    }
    if (this.clientesErro !== null) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.clientesErro,
        aoTentar: () => {
          void this.carregarClientes(true)
        },
      }).montar(area)
      this.clientesSlot.replaceChildren(area)
      return
    }
    if (this.clientes.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhum cliente cadastrado',
        mensagem:
          'Cadastre um cliente para montar uma reserva. As datas informadas serão mantidas.',
        ilustracao: 'pessoas',
        acao: { texto: 'Cadastrar cliente', aoClicar: () => this.irParaClientes() },
      }).montar(area)
      this.clientesSlot.replaceChildren(area)
      return
    }

    this.clientesSlot.replaceChildren(
      criarElemento('div', {
        className: CLASSES.grupoCliente,
        filhos: [this.campos.cliente.raiz, this.campos.buscaCliente.raiz],
      }),
    )
    this.atualizarOpcoesCliente()
  }

  private renderizarEquipamentos(): void {
    if (this.equipamentosSlot === null) {
      return
    }
    if (!this.periodoValido() && !this.consultaFeita && !this.disponibilidadeCarregando) {
      this.lista = null
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Informe as datas para ver equipamentos',
        mensagem: 'Escolha o início e o fim do período para consultar a disponibilidade.',
        acao: { texto: 'Ir para as datas', aoClicar: () => this.campos?.dataInicio.focar() },
      }).montar(area)
      this.equipamentosSlot.replaceChildren(area)
      return
    }

    this.lista = new ListaSelecionavel<Equipamento>({
      id: 'reserva-equipamentos',
      rotulo: 'Equipamentos disponíveis',
      opcoes: this.opcoesDisponiveis(),
      aoSelecionar: (equipamento) => {
        if (this.itens.has(equipamento.id)) {
          this.itens.delete(equipamento.id)
          this.diariasInvalidas.delete(equipamento.id)
        } else {
          this.itens.set(equipamento.id, equipamento.valorDiaria ?? 0)
        }
        this.renderizarEquipamentos()
        this.atualizarResumo()
        this.atualizarMotivo()
      },
      tituloVazio: this.consultaFeita
        ? 'Nenhum equipamento disponível para este período'
        : 'Informe as datas para ver equipamentos',
      mensagemVazia: 'Escolha outro período ou verifique a conservação dos equipamentos.',
      acaoVazio: {
        texto: 'Ver outra data',
        aoClicar: () => this.campos?.dataInicio.focar(),
      },
      carregando: this.disponibilidadeCarregando,
      mensagemCarregando: 'Consultando disponibilidade…',
      erro: this.disponibilidadeErro ?? undefined,
      aoTentar: () => this.tentarDisponibilidade(),
    })
    this.equipamentosSlot.replaceChildren(this.lista.raiz)
  }

  private opcoesCliente(): readonly { readonly valor: string; readonly rotulo: string }[] {
    const selecionado = this.formulario.clienteId
    const termo = this.formulario.buscaCliente.trim().toLocaleLowerCase('pt-BR')
    return this.clientes
      .filter(
        (cliente) =>
          cliente.id === Number(selecionado) ||
          termo === '' ||
          cliente.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
          cliente.cpf.includes(termo) ||
          formatadorPtBr.cpf(cliente.cpf).includes(termo),
      )
      .map((cliente) => ({
        valor: String(cliente.id),
        rotulo: `${cliente.nome} · ${formatadorPtBr.cpf(cliente.cpf)}`,
      }))
  }

  private atualizarOpcoesCliente(): void {
    if (this.modoCliente || this.campos === null) {
      return
    }
    this.campos.cliente.definirOpcoes(this.opcoesCliente())
    this.campos.cliente.definirValor(this.formulario.clienteId)
  }

  private opcoesDisponiveis(): readonly OpcaoListaSelecionavel<Equipamento>[] {
    return this.disponiveis
      .filter(
        (equipamento) =>
          this.formulario.categoria === '' || equipamento.categoria === this.formulario.categoria,
      )
      .map((equipamento) => ({
        item: equipamento,
        rotulo: equipamento.nome,
        descricao: `${equipamento.categoria} · ${equipamento.estadoConservacao}`,
        conteudoDireita: this.itens.has(equipamento.id)
          ? `Selecionado · ${formatadorPtBr.moeda(equipamento.valorDiaria ?? 0)}/dia`
          : formatadorPtBr.moeda(equipamento.valorDiaria ?? 0),
        desabilitado: equipamento.estadoConservacao === 'Em Manutenção',
        selecionado: this.itens.has(equipamento.id),
      }))
  }

  private cancelarTimer(): void {
    if (this.timerDisponibilidade !== null) {
      window.clearTimeout(this.timerDisponibilidade)
      this.timerDisponibilidade = null
    }
  }

  private agendarDisponibilidade(): void {
    this.cancelarTimer()
    this.requisicaoDisponibilidade += 1
    this.disponibilidadeErro = null
    if (!this.periodoValido()) {
      this.disponibilidadeCarregando = false
      this.consultaFeita = false
      this.disponiveis = []
      this.renderizarEquipamentos()
      this.atualizarResumo()
      this.atualizarMotivo()
      return
    }

    this.disponibilidadeCarregando = true
    this.renderizarEquipamentos()
    const token = this.requisicaoDisponibilidade
    this.timerDisponibilidade = window.setTimeout(() => {
      this.timerDisponibilidade = null
      if (token === this.requisicaoDisponibilidade) {
        void this.buscarDisponibilidade(token)
      }
    }, ATRASO_DISPONIBILIDADE_MS)
  }

  private tentarDisponibilidade(): void {
    this.cancelarTimer()
    this.requisicaoDisponibilidade += 1
    void this.buscarDisponibilidade(this.requisicaoDisponibilidade)
  }

  private async buscarDisponibilidade(token: number): Promise<void> {
    if (!this.periodoValido() || token !== this.requisicaoDisponibilidade) {
      return
    }
    this.disponibilidadeCarregando = true
    this.disponibilidadeErro = null
    this.renderizarEquipamentos()

    try {
      const disponiveis = await this.servicoEquipamentos.listarDisponiveis({
        dataInicio: this.formulario.dataInicio,
        dataFim: this.formulario.dataFim,
        ...(this.editandoId === null ? {} : { reservaId: this.editandoId }),
      })
      if (token !== this.requisicaoDisponibilidade) {
        return
      }
      this.disponiveis = disponiveis
      this.consultaFeita = true
      for (const equipamento of disponiveis) {
        this.catalogoItens.set(equipamento.id, equipamento)
      }
      for (const id of [...this.itens.keys()]) {
        if (!disponiveis.some((equipamento) => equipamento.id === id)) {
          this.itens.delete(id)
          this.diariasInvalidas.delete(id)
        }
      }
    } catch {
      if (token !== this.requisicaoDisponibilidade) {
        return
      }
      this.disponibilidadeErro = 'Não foi possível consultar a disponibilidade. Tente novamente.'
      this.consultaFeita = true
    } finally {
      if (token === this.requisicaoDisponibilidade) {
        this.disponibilidadeCarregando = false
        this.renderizarEquipamentos()
        this.atualizarResumo()
        this.atualizarMotivo()
      }
    }
  }

  private atualizarResumo(): void {
    if (this.resumoSlot === null) {
      return
    }
    this.totalSlot = null
    const filhos: Array<Node | string> = []
    if (this.itens.size === 0) {
      this.resumoSlot.replaceChildren(
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: 'Selecione equipamentos na lista acima para montar a reserva.',
        }),
      )
      return
    }

    filhos.push(
      criarElemento('p', {
        className: CLASSES.leituraLinha,
        texto: `${this.itens.size} item(ns) · ${diasEntre(this.formulario.dataInicio, this.formulario.dataFim)} dia(s)`,
      }),
    )
    for (const [equipamentoId, valorDiaria] of this.itens) {
      const campo = new Campo({
        id: `reserva-diaria-${equipamentoId}`,
        rotulo: `Diária — ${this.nomeEquipamento(equipamentoId)}`,
        tipo: 'number',
        valorInicial: String(valorDiaria),
        ajuda: 'Valor acordado por dia; o total é calculado nesta tela.',
        aoAlterar: (valor) => {
          const numero = Number(valor)
          const valido = Number.isFinite(numero) && numero >= 0
          if (valido) {
            this.itens.set(equipamentoId, numero)
            this.diariasInvalidas.delete(equipamentoId)
          } else {
            this.diariasInvalidas.add(equipamentoId)
          }
          campo.definirErro(valido ? null : 'Informe um valor válido.')
          this.atualizarTotal()
          this.atualizarMotivo()
        },
      })
      filhos.push(criarElemento('div', { className: CLASSES.linhaResumo, filhos: [campo.raiz] }))
    }

    this.totalSlot = criarElemento('span', { texto: formatadorPtBr.moeda(this.calcularTotal()) })
    filhos.push(
      criarElemento('div', {
        className: CLASSES.total,
        filhos: ['Total estimado', this.totalSlot],
      }),
    )
    this.resumoSlot.replaceChildren(...filhos)
  }

  private atualizarTotal(): void {
    if (this.totalSlot === null) {
      return
    }
    this.totalSlot.textContent = formatadorPtBr.moeda(this.calcularTotal())
  }

  private calcularTotal(): number {
    const dias = diasEntre(this.formulario.dataInicio, this.formulario.dataFim)
    let total = 0
    for (const valorDiaria of this.itens.values()) {
      total += valorDiaria * dias
    }
    return total
  }

  private nomeEquipamento(id: number): string {
    const equipamento =
      this.disponiveis.find((item) => item.id === id) ?? this.catalogoItens.get(id)
    return equipamento?.nome ?? `Equipamento ${id}`
  }

  private periodoValido(): boolean {
    const inicio = this.formulario.dataInicio
    const fim = this.formulario.dataFim
    return inicio !== '' && fim !== '' && inicio <= fim
  }

  private calcularMotivos(): readonly string[] {
    const motivos: string[] = []
    const carregando = this.carregando || (!this.modoCliente && this.clientesCarregando)
    if (carregando) {
      motivos.push('Carregando dados')
    }
    if (this.modoCliente) {
      if (!clienteVinculado()) {
        motivos.push('Sua conta não está vinculada a um cliente')
      }
    } else if (this.clientesErro !== null) {
      motivos.push('Não foi possível carregar os clientes')
    } else if (!carregando && this.clientes.length === 0) {
      motivos.push('Cadastre um cliente para continuar')
    } else {
      const clienteId = Number(this.formulario.clienteId)
      if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
        motivos.push('Selecione um cliente')
      }
    }
    if (!this.periodoValido()) {
      motivos.push('Informe um período válido')
    }
    if (this.itens.size === 0) {
      motivos.push('Selecione ao menos um equipamento')
    }
    if (this.diariasInvalidas.size > 0) {
      motivos.push('Revise as diárias informadas')
    }
    return motivos
  }

  private atualizarMotivo(): void {
    if (this.motivoSlot === null || this.botaoConfirmar === null) {
      return
    }
    const motivos = this.calcularMotivos()
    if (motivos.length === 0) {
      this.motivoSlot.className = CLASSES.motivo
      this.motivoSlot.textContent = 'Tudo pronto para confirmar.'
      this.botaoConfirmar.raiz.removeAttribute('title')
    } else {
      this.motivoSlot.className = CLASSES.motivoAlerta
      this.motivoSlot.textContent = `Não é possível confirmar: ${motivos.join('; ')}.`
      this.botaoConfirmar.raiz.title = motivos.join('; ')
    }
    this.botaoConfirmar.definirDesabilitado(motivos.length > 0 || this.carregando)
  }

  private validarPeriodo(): boolean {
    const inicio = this.formulario.dataInicio
    const fim = this.formulario.dataFim
    if (inicio === '' || fim === '' || inicio > fim) {
      this.campos?.dataInicio.definirErro(
        inicio === '' ? 'Informe a data de início.' : 'A data de início deve ser anterior ao fim.',
      )
      this.campos?.dataFim.definirErro(fim === '' ? 'Informe a data de fim.' : null)
      return false
    }
    this.campos?.dataInicio.definirErro(null)
    this.campos?.dataFim.definirErro(null)
    return true
  }

  private validar(): boolean {
    const motivos = this.calcularMotivos()
    this.validarPeriodo()
    const clienteId = Number(this.formulario.clienteId)
    if (this.modoCliente) {
      this.campos?.cliente.definirErro(
        clienteVinculado() ? null : 'Fale com a loja para vincular sua conta.',
      )
    } else if (this.clientesErro !== null) {
      this.campos?.cliente.definirErro('Não foi possível carregar os clientes.')
    } else if (this.clientes.length === 0) {
      this.campos?.cliente.definirErro('Cadastre um cliente para continuar.')
    } else if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
      this.campos?.cliente.definirErro('Selecione um cliente.')
    } else {
      this.campos?.cliente.definirErro(null)
    }
    for (const equipamentoId of this.diariasInvalidas) {
      const campo = document.getElementById(`reserva-diaria-${equipamentoId}`)
      if (campo instanceof HTMLInputElement) {
        campo.setAttribute('aria-invalid', 'true')
      }
    }
    if (motivos.length > 0) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Revise a reserva',
        mensagem: `${motivos.join('; ')}.`,
        tom: 'alerta',
      })
    } else {
      this.painel?.definirErro(false)
    }
    return motivos.length === 0
  }

  private temConteudo(): boolean {
    return (
      this.formulario.buscaCliente !== '' ||
      this.formulario.clienteId !== '' ||
      this.formulario.dataInicio !== '' ||
      this.formulario.dataFim !== '' ||
      this.formulario.categoria !== '' ||
      this.itens.size > 0
    )
  }

  private guardarRascunho(): void {
    if (this.modo !== 'novo' || this.editandoId !== null || !this.temConteudo()) {
      limparRascunho()
      return
    }
    guardarRascunho({
      formulario: { ...this.formulario },
      itens: [...this.itens].map(([id, valor]) => [id, valor] as const),
    })
  }

  private limparFormulario(): void {
    this.cancelarTimer()
    this.requisicaoDisponibilidade += 1
    this.formulario = formularioVazio()
    this.itens = new Map()
    this.diariasInvalidas.clear()
    this.catalogoItens.clear()
    this.disponiveis = []
    this.disponibilidadeCarregando = false
    this.disponibilidadeErro = null
    this.consultaFeita = false
    this.falhaEdicao = null
    this.selecionadoId = null
    this.editandoId = null
    this.preservarAoDesmontar = true
    limparRascunho()
    this.montarEstrutura()
    this.painel?.focarPrimeiroControle()
  }

  private rotaConsulta(): string {
    return this.modoCliente ? '#/cliente/minhas-reservas' : '#/reservas'
  }

  private rotaNovo(): string {
    return this.modoCliente ? '#/cliente/nova-reserva' : '#/reservas/nova'
  }

  private idClienteParaEnvio(): number | null {
    if (this.modoCliente) {
      return idClienteVinculado()
    }
    const id = Number(this.formulario.clienteId)
    return Number.isSafeInteger(id) && id > 0 ? id : null
  }

  private irParaNovo(): void {
    limparRascunho()
    window.location.hash = this.rotaNovo()
  }

  private irParaConsulta(): void {
    this.guardarRascunho()
    window.location.hash = this.rotaConsulta()
  }

  private irParaConsultaAposSucesso(): void {
    this.preservarAoDesmontar = false
    limparRascunho()
    window.location.hash = this.rotaConsulta()
  }

  private irParaEdicao(id: number): void {
    if (!ehAdministrador()) {
      this.toasts.exibir({
        mensagem: 'Somente o administrador pode editar reservas.',
        tom: 'alerta',
      })
      return
    }
    limparRascunho()
    guardarEdicao(id)
    window.location.hash = '#/reservas/nova'
  }

  private irParaClientes(): void {
    this.guardarRascunho()
    window.location.hash = '#/clientes'
  }

  private async editar(id: number): Promise<void> {
    if (!ehAdministrador()) {
      this.toasts.exibir({
        mensagem: 'Somente o administrador pode editar reservas.',
        tom: 'alerta',
      })
      return
    }
    this.cancelarTimer()
    this.requisicaoDisponibilidade += 1
    this.editandoId = id
    this.selecionadoId = id
    this.falhaEdicao = null
    try {
      const [reserva, itens] = await Promise.all([
        this.servico.buscarPorId(id),
        this.servicoItens.listar({ reservaId: id }),
      ])
      this.formulario = {
        buscaCliente: '',
        clienteId: String(reserva.clienteId),
        dataInicio: reserva.dataInicio,
        dataFim: reserva.dataFim,
        categoria: '',
      }
      this.itens = new Map(itens.map((item) => [item.equipamentoId, item.valorDiaria]))
      this.diariasInvalidas.clear()
      this.disponiveis = []
      this.consultaFeita = false
      this.disponibilidadeErro = null
      this.montarEstrutura()
      await this.buscarDisponibilidade(++this.requisicaoDisponibilidade)
      this.painel?.focarPrimeiroControle()
    } catch {
      this.disponibilidadeCarregando = false
      this.falhaEdicao = 'Não foi possível carregar esta reserva. Tente novamente.'
      this.montarEstrutura()
      this.toasts.exibir({
        titulo: 'Não foi possível abrir',
        mensagem: this.falhaEdicao,
        tom: 'erro',
      })
    }
  }

  private cancelarEdicao(): void {
    if (this.modo === 'novo') {
      if (this.temConteudo()) {
        this.limparFormulario()
      } else {
        this.irParaConsulta()
      }
      return
    }
    this.filtros = filtrosVazios()
    this.selecionadoId = null
    this.montarEstrutura()
  }

  private aplicarDestaquePendente(): void {
    if (this.modo !== 'consulta' || this.destaquePendente === null) {
      return
    }
    const destaque = this.destaquePendente
    this.destaquePendente = null
    this.filtros = filtrosVazios()
    if (this.reservas.some((reserva) => reserva.id === destaque.id)) {
      this.selecionadoId = destaque.id
    }
    this.atualizarTabela()
    this.atualizarDetalhes()
    this.toasts.exibir({
      titulo: destaque.mensagem.titulo,
      mensagem: destaque.mensagem.texto,
      tom: destaque.mensagem.tom,
    })
  }

  private criarFiltros(): HTMLElement {
    this.campoFiltroCliente = new Campo({
      id: 'reservas-filtro-cliente',
      rotulo: this.modoCliente ? 'Número da reserva' : 'Cliente ou reserva',
      placeholder: this.modoCliente ? 'Ex.: 42' : 'Nome, CPF ou número',
      icone: ICONE_BUSCA,
      valorInicial: this.filtros.cliente,
      aoAlterar: (valor) => {
        this.filtros = { ...this.filtros, cliente: valor }
        this.atualizarTabela()
      },
    })
    const status = new Select({
      id: 'reservas-filtro-status',
      rotulo: 'Status',
      valorInicial: this.filtros.status,
      opcoes: [
        { valor: '', rotulo: 'Todos os status' },
        ...STATUS.map((item) => ({ valor: item, rotulo: item })),
      ],
      aoAlterar: (valor) => {
        this.filtros = { ...this.filtros, status: ehStatusReserva(valor) ? valor : '' }
        this.atualizarTabela()
      },
    })
    const inicio = new Campo({
      id: 'reservas-filtro-inicio',
      rotulo: 'Início a partir de',
      tipo: 'date',
      valorInicial: this.filtros.inicio,
      aoAlterar: (valor) => {
        this.filtros = { ...this.filtros, inicio: valor }
        this.atualizarTabela()
      },
    })
    const fim = new Campo({
      id: 'reservas-filtro-fim',
      rotulo: 'Fim até',
      tipo: 'date',
      valorInicial: this.filtros.fim,
      aoAlterar: (valor) => {
        this.filtros = { ...this.filtros, fim: valor }
        this.atualizarTabela()
      },
    })
    return criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [this.campoFiltroCliente.raiz, status.raiz, inicio.raiz, fim.raiz],
    })
  }

  private atualizarTabela(): void {
    if (this.tabelaSlot === null) {
      return
    }
    if (this.carregando) {
      const area = criarElemento('div')
      new Carregando({
        mensagem: 'Carregando reservas…',
        variante: 'skeleton',
        linhas: 4,
      }).montar(area)
      this.tabelaSlot.replaceChildren(area)
      return
    }

    if (this.falhaLista !== null && this.reservas.length === 0) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.falhaLista,
        aoTentar: () => {
          void this.recarregar()
        },
      }).montar(area)
      this.tabelaSlot.replaceChildren(area)
      return
    }

    const reservas = this.filtrarReservas()
    if (reservas.length === 0) {
      const area = criarElemento('div')
      const filtrando =
        this.filtros.cliente !== '' ||
        this.filtros.status !== '' ||
        this.filtros.inicio !== '' ||
        this.filtros.fim !== ''
      new EstadoVazio({
        ilustracao: 'reservas',
        titulo: filtrando ? 'Nenhuma reserva com estes filtros' : 'Nenhuma reserva lançada',
        mensagem: filtrando
          ? 'Ajuste os filtros ou limpe a busca para ver outras reservas.'
          : this.modoCliente
            ? 'Faça sua primeira reserva quando quiser alugar um equipamento.'
            : 'Crie a primeira reserva da locadora.',
        acao: { texto: 'Nova reserva', aoClicar: () => this.irParaNovo() },
      }).montar(area)
      this.tabelaSlot.replaceChildren(area)
      return
    }

    if (this.modoCliente) {
      const cartoes = reservas.map((reserva) => {
        const selecionado = this.selecionadoId === reserva.id
        const cartao = criarElemento('button', {
          className: selecionado ? CLASSES.cartaoReservaAtivo : CLASSES.cartaoReserva,
          atributos: {
            type: 'button',
            'aria-pressed': selecionado ? 'true' : 'false',
          },
          filhos: [
            criarElemento('span', {
              className: CLASSES.cartaoTitulo,
              texto: `Reserva #${reserva.id}`,
            }),
            criarElemento('span', {
              className: CLASSES.cartaoLinha,
              texto: `${formatadorPtBr.data(reserva.dataInicio)} a ${formatadorPtBr.data(reserva.dataFim)}`,
            }),
            badgeStatus(reserva.statusReserva).raiz,
          ],
        })
        cartao.addEventListener('click', () => this.selecionar(reserva.id))
        return cartao
      })
      const filhos: Array<Node> = cartoes
      if (this.falhaLista !== null) {
        filhos.push(
          criarElemento('div', {
            className: CLASSES.avisoDesatualizado,
            texto: 'Dados desatualizados · tente recarregar',
          }),
        )
      }
      this.tabelaSlot.replaceChildren(...filhos)
      return
    }

    const tabela = new Tabela<LinhaReserva>({
      colunas: [
        ...COLUNAS_BASE,
        {
          chave: 'acoes',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoes(linha.id),
        },
      ],
      linhas: reservas.map((reserva) => this.paraLinha(reserva)),
      mensagemVazia: 'Nenhuma reserva encontrada.',
      aoSelecionar: (linha) => this.selecionar(linha.id),
      linhaSelecionada: (linha) => this.selecionadoId === linha.id,
    })
    const cabecalho = tabela.raiz.querySelector('thead')
    if (cabecalho !== null) {
      cabecalho.className = CLASSES.cabecalhoFixo
    }
    const filhos: Array<Node> = [
      criarElemento('div', { className: CLASSES.tabelaScroll, filhos: [tabela.raiz] }),
    ]
    if (this.falhaLista !== null) {
      filhos.push(
        criarElemento('div', {
          className: CLASSES.avisoDesatualizado,
          texto: 'Dados desatualizados · tente recarregar',
        }),
      )
    }
    this.tabelaSlot.replaceChildren(...filhos)
  }

  private filtrarReservas(): readonly Reserva[] {
    const termo = this.filtros.cliente.trim().toLocaleLowerCase('pt-BR')
    return this.reservas.filter((reserva) => {
      const nome = this.nomeCliente(reserva.clienteId).toLocaleLowerCase('pt-BR')
      const correspondeCliente =
        termo === '' ||
        nome.includes(termo) ||
        String(reserva.id).includes(termo) ||
        formatadorPtBr
          .cpf(this.clientes.find((cliente) => cliente.id === reserva.clienteId)?.cpf ?? '')
          .includes(termo)
      const correspondeStatus =
        this.filtros.status === '' || reserva.statusReserva === this.filtros.status
      const correspondeInicio =
        this.filtros.inicio === '' || reserva.dataInicio >= this.filtros.inicio
      const correspondeFim = this.filtros.fim === '' || reserva.dataFim <= this.filtros.fim
      return correspondeCliente && correspondeStatus && correspondeInicio && correspondeFim
    })
  }

  private paraLinha(reserva: Reserva): LinhaReserva {
    return {
      id: reserva.id,
      cliente: this.nomeCliente(reserva.clienteId),
      inicio: formatadorPtBr.data(reserva.dataInicio),
      fim: formatadorPtBr.data(reserva.dataFim),
      status: reserva.statusReserva,
      previsao: reserva.previsaoTempo?.trim() || '—',
      ativo: reserva.ativo,
      acoes: '',
    }
  }

  private criarAcoes(id: number): HTMLElement {
    const container = criarElemento('div', { className: CLASSES.acoes })
    const reserva = this.reservas.find((item) => item.id === id)
    if (reserva === undefined) {
      return container
    }

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

    if (ehAdministrador()) {
      const editar = criarElemento('button', {
        className: CLASSES.acao,
        atributos: { type: 'button' },
        texto: 'Editar',
      })
      editar.addEventListener('click', (evento) => {
        evento.stopPropagation()
        this.irParaEdicao(id)
      })
      container.append(editar)

      const inativar = criarElemento('button', {
        className: CLASSES.acaoPerigo,
        atributos: { type: 'button' },
        texto: 'Inativar',
      })
      inativar.disabled = !reserva.ativo
      inativar.addEventListener('click', (evento) => {
        evento.stopPropagation()
        this.confirmarInativacao(reserva)
      })
      container.append(inativar)

      if (reserva.statusReserva !== 'Cancelada') {
        const cancelar = criarElemento('button', {
          className: CLASSES.acaoPerigo,
          atributos: { type: 'button' },
          texto: 'Cancelar',
        })
        cancelar.addEventListener('click', (evento) => {
          evento.stopPropagation()
          this.selecionar(id)
          this.abrirCancelamento(reserva)
        })
        container.append(cancelar)
      }
    }
    return container
  }

  private atualizarDetalhes(): void {
    if (this.areaDetalhes === null) {
      return
    }
    const reserva = this.reservas.find((item) => item.id === this.selecionadoId)
    if (reserva === undefined) {
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'reservas',
        titulo: 'Nenhuma reserva selecionada',
        mensagem: this.modoCliente
          ? 'Selecione uma reserva para ver período, status e previsão.'
          : 'Selecione uma linha da tabela para ver cliente, período e previsão.',
        acao: { texto: 'Nova reserva', aoClicar: () => this.irParaNovo() },
      }).montar(area)
      this.areaDetalhes.replaceChildren(area)
      return
    }

    const linhas: Array<Node> = [
      this.criarLinhaDetalhe('Reserva', `#${reserva.id}`),
      this.criarLinhaDetalhe(
        this.modoCliente ? 'Titular' : 'Cliente',
        this.nomeCliente(reserva.clienteId),
      ),
      this.criarLinhaDetalhe(
        'Período',
        `${formatadorPtBr.data(reserva.dataInicio)} a ${formatadorPtBr.data(reserva.dataFim)}`,
      ),
      this.criarLinhaDetalhe('Status', '', badgeStatus(reserva.statusReserva).raiz),
      this.criarLinhaDetalhe(
        'Previsão',
        reserva.previsaoTempo?.trim() || 'Indisponível (a reserva não fica bloqueada).',
      ),
      this.criarLinhaDetalhe('Situação', '', badgeAtivo(reserva.ativo).raiz),
    ]
    if (reserva.altaDemandaPrevista === true) {
      linhas.push(
        this.criarLinhaDetalhe(
          'Demanda',
          '',
          new Badge({ texto: 'Alta demanda prevista', tom: 'alerta' }).raiz,
        ),
      )
    }

    const acoes: Array<Node> = []
    if (ehAdministrador()) {
      acoes.push(
        new Botao({
          texto: 'Editar',
          variante: 'secundario',
          aoClicar: () => this.irParaEdicao(reserva.id),
        }).raiz,
      )
      if (reserva.statusReserva !== 'Cancelada') {
        acoes.push(
          new Botao({
            texto: 'Cancelar reserva',
            variante: 'destrutivo',
            aoClicar: () => this.abrirCancelamento(reserva),
          }).raiz,
        )
      }
      if (reserva.ativo) {
        acoes.push(
          new Botao({
            texto: 'Inativar',
            variante: 'secundario',
            aoClicar: () => this.confirmarInativacao(reserva),
          }).raiz,
        )
      }
    }

    const detalhes = criarElemento('section', {
      className: CLASSES.detalhes,
      atributos: { 'aria-label': `Detalhes da reserva ${reserva.id}` },
      filhos: [
        criarElemento('h3', {
          className: CLASSES.detalhesTitulo,
          texto: `Reserva #${reserva.id}`,
        }),
        ...linhas,
      ],
    })
    if (acoes.length > 0) {
      detalhes.append(criarElemento('div', { className: CLASSES.detalhesAcoes, filhos: acoes }))
    }
    this.areaDetalhes.replaceChildren(detalhes)
  }

  private criarLinhaDetalhe(rotulo: string, valor: string, destaque?: Node): HTMLElement {
    return criarElemento('div', {
      className: CLASSES.detalhesLinha,
      filhos: [
        criarElemento('span', { className: CLASSES.detalhesRotulo, texto: rotulo }),
        destaque ?? criarElemento('span', { className: CLASSES.detalhesValor, texto: valor }),
      ],
    })
  }

  private nomeCliente(id: number): string {
    if (this.modoCliente) {
      return sessaoAtiva()?.nome ?? 'Você'
    }
    return this.clientes.find((cliente) => cliente.id === id)?.nome ?? `Cliente ${id}`
  }

  private selecionar(id: number): void {
    this.selecionadoId = id
    this.atualizarTabela()
    this.atualizarDetalhes()
  }

  private confirmarInativacao(reserva: Reserva): void {
    if (!ehAdministrador() || !reserva.ativo || this.modal !== null) {
      return
    }
    this.confirmar({
      titulo: 'Inativar reserva',
      conteudo: criarElemento('p', {
        className: CLASSES.leituraLinha,
        texto: `Inativar a reserva #${reserva.id} de ${this.nomeCliente(reserva.clienteId)}? O registro será preservado e marcado como Inativo.`,
      }),
      rotulo: 'Inativar',
      variante: 'destrutivo',
      acao: () => {
        void this.inativar(reserva.id)
      },
    })
  }

  private async inativar(id: number): Promise<void> {
    try {
      await this.servico.inativar(id)
      this.selecionadoId = id
      await this.recarregar()
      this.toasts.exibir({
        titulo: 'Reserva inativada',
        mensagem: 'Registro preservado e marcado como Inativo.',
        tom: 'sucesso',
      })
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível inativar',
        mensagem: 'Tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private abrirCancelamento(reserva: Reserva): void {
    this.confirmar({
      titulo: 'Cancelar reserva',
      conteudo: criarElemento('p', {
        className: CLASSES.leituraLinha,
        texto: `Cancelar a reserva #${reserva.id} de ${this.nomeCliente(reserva.clienteId)}?`,
      }),
      rotulo: 'Cancelar reserva',
      variante: 'destrutivo',
      acao: () => {
        void this.cancelarReserva(reserva.id)
      },
    })
  }

  private async cancelarReserva(id: number): Promise<void> {
    try {
      await this.servico.atualizar({ id, statusReserva: 'Cancelada' })
      this.selecionadoId = id
      await this.recarregar()
      this.toasts.exibir({
        titulo: 'Reserva cancelada',
        mensagem: `Reserva #${id} cancelada.`,
        tom: 'sucesso',
      })
    } catch {
      this.toasts.exibir({
        titulo: 'Não foi possível cancelar',
        mensagem: 'Tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private abrirConfirmacao(): void {
    if (this.modal !== null) {
      return
    }
    if (!this.validar()) {
      return
    }
    if (this.editandoId !== null) {
      this.abrirConfirmacaoEdicao()
      return
    }
    this.abrirConfirmacaoCriacao()
  }

  private abrirConfirmacaoCriacao(): void {
    const clienteId = this.idClienteParaEnvio()
    if (clienteId === null) {
      this.toasts.exibir({
        mensagem: 'Sua conta não está vinculada a um cliente. Fale com a loja.',
        tom: 'alerta',
      })
      return
    }
    const itens: readonly ItemReservaEntrada[] = [...this.itens].map(
      ([equipamentoId, valorDiaria]) => ({
        equipamentoId,
        valorDiaria,
      }),
    )
    const dados: ReservaCriarEntrada = {
      clienteId,
      dataInicio: this.formulario.dataInicio,
      dataFim: this.formulario.dataFim,
      itens,
    }
    const conteudo = criarElemento('div', {
      filhos: [
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `${this.nomeCliente(dados.clienteId)} · ${formatadorPtBr.data(dados.dataInicio)} a ${formatadorPtBr.data(dados.dataFim)} · ${itens.length} item(ns).`,
        }),
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Total estimado: ${formatadorPtBr.moeda(this.calcularTotal())}.`,
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto:
            'A previsão do tempo é consultada pelo sistema ao confirmar; sua indisponibilidade não bloqueia a reserva.',
        }),
      ],
    })
    this.confirmar({
      titulo: 'Confirmar reserva',
      conteudo,
      rotulo: 'Confirmar reserva',
      permitirAtalho: true,
      acao: () => {
        void this.confirmarReserva(dados)
      },
    })
  }

  private abrirConfirmacaoEdicao(): void {
    if (this.editandoId === null || !ehAdministrador()) {
      return
    }
    const itens: readonly ItemReservaEntrada[] = [...this.itens].map(
      ([equipamentoId, valorDiaria]) => ({
        equipamentoId,
        valorDiaria,
      }),
    )
    const dados: ReservaAtualizarEntrada = {
      id: this.editandoId,
      clienteId: Number(this.formulario.clienteId),
      dataInicio: this.formulario.dataInicio,
      dataFim: this.formulario.dataFim,
      itens,
    }
    const conteudo = criarElemento('div', {
      filhos: [
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `${this.nomeCliente(dados.clienteId ?? 0)} · ${formatadorPtBr.data(dados.dataInicio ?? '')} a ${formatadorPtBr.data(dados.dataFim ?? '')} · ${itens.length} item(ns).`,
        }),
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Total estimado: ${formatadorPtBr.moeda(this.calcularTotal())}.`,
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto: 'O status e a previsão do tempo existentes não serão alterados nesta edição.',
        }),
      ],
    })
    this.confirmar({
      titulo: 'Salvar alterações da reserva',
      conteudo,
      rotulo: 'Salvar alterações',
      permitirAtalho: true,
      acao: () => {
        void this.salvarEdicao(dados)
      },
    })
  }

  private async confirmarReserva(dados: ReservaCriarEntrada): Promise<void> {
    let criada: Reserva
    try {
      criada = await this.servico.criar(dados)
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível confirmar',
        mensagem: 'Verifique os dados e tente novamente em instantes.',
        tom: 'erro',
      })
      return
    }

    let confirmada: Reserva = criada
    let falhaConfirmacao = false
    try {
      confirmada = await this.servico.atualizar({ id: criada.id, statusReserva: 'Confirmada' })
    } catch {
      falhaConfirmacao = true
    }

    const previsao = confirmada.previsaoTempo?.trim() ?? ''
    const mensagem: MensagemDestaque = falhaConfirmacao
      ? {
          titulo: 'Reserva registrada',
          texto: `Reserva #${criada.id} criada, mas a confirmação não foi concluída. Confira o status na consulta.`,
          tom: 'alerta',
        }
      : {
          titulo: 'Reserva confirmada',
          texto:
            previsao === ''
              ? `Reserva #${confirmada.id} confirmada. Previsão indisponível; a locação não fica bloqueada.`
              : `Reserva #${confirmada.id} confirmada. Previsão: ${previsao}`,
          tom: 'sucesso',
        }
    guardarDestaque({ id: criada.id, mensagem })
    this.irParaConsultaAposSucesso()
  }

  private async salvarEdicao(dados: ReservaAtualizarEntrada): Promise<void> {
    try {
      await this.servico.atualizar(dados)
      guardarDestaque({
        id: dados.id,
        mensagem: {
          titulo: 'Reserva atualizada',
          texto: `Reserva #${dados.id} atualizada. Status e previsão preservados.`,
          tom: 'sucesso',
        },
      })
      this.irParaConsultaAposSucesso()
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: 'Verifique os dados e tente novamente em instantes.',
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
    const voltar = new Botao({
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
      id: 'reservas-confirmacao',
      titulo: opcoes.titulo,
      conteudo: opcoes.conteudo,
      rodape: [voltar.raiz, confirmar.raiz],
      aoFechar: () => {
        this.modal = null
        this.confirmacaoRapida = null
      },
    })
    this.modal = modal
    modal.abrir()
  }
}
