import type { CategoriaEquipamento, Equipamento, PeriodoEntrada } from '../../../shared/contratos/modelos'
import {
  Botao,
  Campo,
  Carregando,
  EstadoErro,
  EstadoVazio,
  Select,
} from '../componentes'
import {
  Componente,
  ROTA_CLIENTE_NOVA_RESERVA,
  criarElemento,
} from '../nucleo'
import { EquipamentoServico } from '../servicos'
import { formatadorPtBr } from '../util'

type EstadoConsulta = 'inicial' | 'carregando' | 'erro' | 'sucesso'
type SituacaoDia = 'livre' | 'ocupado' | 'erro'

/** Categorias são domínio fechado do contrato: não consultamos `categorias:*`. */
const CATEGORIAS: readonly CategoriaEquipamento[] = [
  'Bicicleta',
  'Caiaque',
  'Prancha',
  'Camping',
]

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  formulario:
    'grid grid-cols-1 gap-4 rounded-card border border-granito/45 bg-superficie p-4 shadow-card md:grid-cols-4',
  acoes: 'flex flex-wrap items-end gap-2',
  aviso: 'rounded-card border border-alerta/40 bg-alerta-suave px-3 py-2 text-xs text-alerta',
  resultado: 'min-h-0 flex-1 overflow-y-auto rounded-card border border-granito/45 bg-pedra p-4',
  grade: 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3',
  cartao: 'flex flex-col gap-2 rounded-card border border-granito/45 bg-superficie p-4 shadow-card',
  cartaoTitulo: 'font-semibold text-floresta',
  cartaoLinha: 'text-sm text-grafite',
  rodape: 'mt-3 flex flex-wrap items-center justify-between gap-3',
  calendario: 'rounded-card border border-granito/45 bg-superficie p-4 shadow-card',
  calendarioTopo: 'mb-3 flex flex-wrap items-center justify-between gap-3',
  calendarioTitulo: 'font-display text-sm font-semibold text-floresta',
  calendarioNavegacao: 'flex flex-wrap items-center gap-2',
  navBotao:
    'rounded-control border border-granito/45 px-3 py-1 text-sm font-semibold text-floresta hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  gradeSemana: 'grid grid-cols-7 gap-1 text-center text-xs font-semibold text-floresta/70',
  gradeDias: 'mt-2 grid grid-cols-7 gap-1',
  dia: 'h-9 rounded-control border border-granito/40 text-sm text-grafite transition-colors motion-reduce:transition-none',
  diaLivre: 'h-9 rounded-control border border-lima bg-lima/25 text-floresta hover:bg-lima/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  diaOcupado:
    'h-9 rounded-control border border-erro/40 bg-erro-suave text-erro line-through',
  diaErro: 'h-9 rounded-control border border-alerta/40 bg-alerta-suave text-alerta',
  diaVazio: 'h-9',
  legenda: 'mt-3 flex flex-wrap gap-4 text-xs text-grafite',
  legendaItem: 'inline-flex items-center gap-2',
  legendaLivre: 'inline-block h-3 w-3 rounded-full bg-lima',
  legendaOcupado: 'inline-block h-3 w-3 rounded-full bg-erro',
  legendaErro: 'inline-block h-3 w-3 rounded-full bg-alerta',
} as const

export class PaginaDisponibilidadeCliente extends Componente {
  private readonly servico = new EquipamentoServico()
  private readonly campoTipo: Campo
  private readonly campoFim: Campo
  private readonly categoria: Select
  private readonly botaoConsultar: Botao
  private readonly areaErroFormulario: HTMLParagraphElement
  private readonly areaResultado: HTMLElement
  private readonly areaCalendario: HTMLElement
  private readonly formulario: HTMLFormElement
  private estado: EstadoConsulta = 'inicial'
  private equipamentos: readonly Equipamento[] = []
  private mensagemErro: string | null = null
  private mesCalendario = new Date()
  private calendario = new Map<string, SituacaoDia>()
  private calendarioCarregando = false
  private readonly aoSubmit = (evento: SubmitEvent): void => {
    evento.preventDefault()
    void this.consultar()
  }

  constructor() {
    const campoTipo = new Campo({
      id: 'cliente-disponibilidade-inicio',
      rotulo: 'Data de retirada',
      tipo: 'date',
      obrigatorio: true,
    })
    const campoFim = new Campo({
      id: 'cliente-disponibilidade-fim',
      rotulo: 'Data de devolução',
      tipo: 'date',
      obrigatorio: true,
    })
    const categoria = new Select({
      id: 'cliente-disponibilidade-categoria',
      rotulo: 'Categoria',
      placeholder: 'Todas',
      opcoes: [
        { valor: '', rotulo: 'Todas as categorias' },
        ...CATEGORIAS.map((item) => ({ valor: item, rotulo: item })),
      ],
      aoAlterar: () => this.renderizarResultado(),
    })
    const botaoConsultar = new Botao({
      id: 'cliente-disponibilidade-consultar',
      texto: 'Consultar',
      tipo: 'submit',
      variante: 'primario',
    })
    const areaErroFormulario = criarElemento('p', {
      className: CLASSES.aviso,
      atributos: { role: 'alert', 'aria-live': 'polite' },
    })
    areaErroFormulario.hidden = true
    const formulario = criarElemento('form', {
      className: CLASSES.formulario,
      atributos: { novalidate: '', 'aria-label': 'Consultar disponibilidade' },
      filhos: [
        campoTipo.raiz,
        campoFim.raiz,
        categoria.raiz,
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [botaoConsultar.raiz],
        }),
        areaErroFormulario,
      ],
    })
    const areaCalendario = criarElemento('div', { className: CLASSES.calendario })
    const areaResultado = criarElemento('div', { className: CLASSES.resultado })

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [
          criarElemento('div', {
            className: CLASSES.cabecalho,
            filhos: [
              criarElemento('div', {
                filhos: [
                  criarElemento('h2', {
                    className: CLASSES.titulo,
                    texto: 'Disponibilidade',
                  }),
                  criarElemento('p', {
                    className: CLASSES.subtitulo,
                    texto:
                      'Escolha o período para ver o que está livre. A previsão do tempo é consultada ao confirmar a reserva.',
                  }),
                ],
              }),
            ],
          }),
          formulario,
          areaCalendario,
          areaResultado,
        ],
      }),
    )

    this.campoTipo = campoTipo
    this.campoFim = campoFim
    this.categoria = categoria
    this.botaoConsultar = botaoConsultar
    this.areaErroFormulario = areaErroFormulario
    this.areaResultado = areaResultado
    this.areaCalendario = areaCalendario
    this.formulario = formulario
    formulario.addEventListener('submit', this.aoSubmit)
  }

  protected aoMontar(): void {
    this.campoTipo.focar()
    void this.carregarCalendario()
  }

  protected aoDesmontar(): void {
    this.formulario.removeEventListener('submit', this.aoSubmit)
  }

  private periodo(): PeriodoEntrada | null {
    const dataInicio = this.campoTipo.valor()
    const dataFim = this.campoFim.valor()
    if (dataInicio === '' || dataFim === '' || dataInicio > dataFim) {
      return null
    }
    return { dataInicio, dataFim }
  }

  private async consultar(): Promise<void> {
    const periodo = this.periodo()
    if (periodo === null) {
      this.mostrarErroFormulario('Informe uma retirada e uma devolução válidas.')
      this.campoTipo.focar()
      return
    }
    this.mostrarErroFormulario(null)
    this.estado = 'carregando'
    this.mensagemErro = null
    this.botaoConsultar.definirDesabilitado(true)
    this.renderizarResultado()

    try {
      this.equipamentos = await this.servico.listarDisponiveis(periodo)
      this.estado = 'sucesso'
    } catch {
      this.equipamentos = []
      this.mensagemErro = 'Não foi possível consultar a disponibilidade. Tente novamente.'
      this.estado = 'erro'
    } finally {
      this.botaoConsultar.definirDesabilitado(false)
      this.renderizarResultado()
    }
  }

  private chaveDia(data: Date): string {
    const ano = String(data.getFullYear())
    const mes = String(data.getMonth() + 1).padStart(2, '0')
    const dia = String(data.getDate()).padStart(2, '0')
    return `${ano}-${mes}-${dia}`
  }

  private mudarMes(delta: number): void {
    const atual = this.mesCalendario
    this.mesCalendario = new Date(atual.getFullYear(), atual.getMonth() + delta, 1)
    this.calendario = new Map()
    void this.carregarCalendario()
  }

  private async carregarCalendario(): Promise<void> {
    const ano = this.mesCalendario.getFullYear()
    const mes = this.mesCalendario.getMonth()
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    const chaves = Array.from(
      { length: totalDias },
      (_, indice) => this.chaveDia(new Date(ano, mes, indice + 1)),
    )
    this.calendarioCarregando = true
    this.renderizarCalendario()
    try {
      const resultados = await Promise.all(
        chaves.map(async (chave): Promise<readonly [string, SituacaoDia]> => {
          try {
            const livres = await this.servico.listarDisponiveis({
              dataInicio: chave,
              dataFim: chave,
            })
            return [chave, livres.length > 0 ? 'livre' : 'ocupado']
          } catch {
            return [chave, 'erro']
          }
        }),
      )
      this.calendario = new Map(resultados)
    } finally {
      this.calendarioCarregando = false
      this.renderizarCalendario()
    }
  }

  private renderizarCalendario(): void {
    const ano = this.mesCalendario.getFullYear()
    const mes = this.mesCalendario.getMonth()
    const rotuloMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(
      this.mesCalendario,
    )
    const anterior = criarElemento('button', {
      className: CLASSES.navBotao,
      atributos: { type: 'button', 'aria-label': 'Mês anterior' },
      texto: '‹',
    })
    anterior.addEventListener('click', () => this.mudarMes(-1))
    const proximo = criarElemento('button', {
      className: CLASSES.navBotao,
      atributos: { type: 'button', 'aria-label': 'Próximo mês' },
      texto: '›',
    })
    proximo.addEventListener('click', () => this.mudarMes(1))

    const filhos: Array<Node> = [
      criarElemento('div', {
        className: CLASSES.calendarioTopo,
        filhos: [
          criarElemento('h3', { className: CLASSES.calendarioTitulo, texto: rotuloMes }),
          criarElemento('div', {
            className: CLASSES.calendarioNavegacao,
            filhos: [anterior, proximo],
          }),
        ],
      }),
      criarElemento('div', {
        className: CLASSES.gradeSemana,
        filhos: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dia) =>
          criarElemento('span', { texto: dia }),
        ),
      }),
    ]

    const grade = criarElemento('div', { className: CLASSES.gradeDias })
    for (let indice = 0; indice < new Date(ano, mes, 1).getDay(); indice += 1) {
      grade.append(criarElemento('span', { className: CLASSES.diaVazio }))
    }
    const totalDias = new Date(ano, mes + 1, 0).getDate()
    for (let dia = 1; dia <= totalDias; dia += 1) {
      const data = new Date(ano, mes, dia)
      const chave = this.chaveDia(data)
      const situacao = this.calendario.get(chave) ?? 'livre'
      const classe =
        situacao === 'ocupado'
          ? CLASSES.diaOcupado
          : situacao === 'erro'
            ? CLASSES.diaErro
            : this.calendarioCarregando
              ? CLASSES.dia
              : CLASSES.diaLivre
      const botao = criarElemento('button', {
        className: classe,
        atributos: {
          type: 'button',
          'aria-label': `${formatadorPtBr.data(chave)}: ${
            situacao === 'ocupado'
              ? 'sem equipamento livre (reservado ou em manutenção)'
              : situacao === 'erro'
                ? 'consulta indisponível'
                : 'equipamentos livres'
          }`,
        },
        texto: String(dia),
      })
      botao.disabled = situacao !== 'livre' || this.calendarioCarregando
      botao.addEventListener('click', () => {
        this.campoTipo.definirValor(chave)
        const fim = this.campoFim.valor()
        if (fim === '' || fim < chave) {
          this.campoFim.definirValor(chave)
        }
        void this.consultar()
      })
      grade.append(botao)
    }
    filhos.push(grade)
    filhos.push(
      criarElemento('div', {
        className: CLASSES.legenda,
        filhos: [
          criarElemento('span', {
            className: CLASSES.legendaItem,
            filhos: [
              criarElemento('span', { className: CLASSES.legendaLivre }),
              'Livre para reserva',
            ],
          }),
          criarElemento('span', {
            className: CLASSES.legendaItem,
            filhos: [
              criarElemento('span', { className: CLASSES.legendaOcupado }),
              'Reservado ou em manutenção',
            ],
          }),
          criarElemento('span', {
            className: CLASSES.legendaItem,
            filhos: [
              criarElemento('span', { className: CLASSES.legendaErro }),
              'Consulta indisponível',
            ],
          }),
        ],
      }),
    )
    this.areaCalendario.replaceChildren(...filhos)
  }

  private renderizarResultado(): void {
    if (this.estado === 'carregando') {
      const area = criarElemento('div')
      new Carregando({
        mensagem: 'Consultando disponibilidade…',
        variante: 'skeleton',
        linhas: 4,
      }).montar(area)
      this.areaResultado.replaceChildren(area)
      return
    }

    if (this.estado === 'erro') {
      const area = criarElemento('div')
      new EstadoErro({
        titulo: 'Não foi possível consultar',
        mensagem: this.mensagemErro ?? 'Não foi possível consultar a disponibilidade.',
        aoTentar: () => {
          void this.consultar()
        },
      }).montar(area)
      this.areaResultado.replaceChildren(area)
      return
    }

    if (this.estado === 'inicial') {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Informe as datas para consultar',
        mensagem: 'Escolha a retirada e a devolução para ver os equipamentos livres.',
        ilustracao: 'equipamentos',
      }).montar(area)
      this.areaResultado.replaceChildren(area)
      return
    }

    const filtro = this.categoria.valor()
    const itens = this.equipamentos.filter(
      (equipamento) => filtro === '' || equipamento.categoria === filtro,
    )
    if (itens.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhum equipamento disponível',
        mensagem: 'Tente outro período ou remova o filtro de categoria.',
        ilustracao: 'equipamentos',
        acao: { texto: 'Consultar de novo', aoClicar: () => this.campoTipo.focar() },
      }).montar(area)
      this.areaResultado.replaceChildren(area)
      return
    }

    const cartoes = itens.map((equipamento) =>
      criarElemento('article', {
        className: CLASSES.cartao,
        filhos: [
          criarElemento('h3', {
            className: CLASSES.cartaoTitulo,
            texto: equipamento.nome,
          }),
          criarElemento('p', {
            className: CLASSES.cartaoLinha,
            texto: `${equipamento.categoria} · ${equipamento.estadoConservacao}`,
          }),
          criarElemento('p', {
            className: CLASSES.cartaoLinha,
            texto: `${formatadorPtBr.moeda(equipamento.valorDiaria ?? 0)} por dia`,
          }),
        ],
      }),
    )
    this.areaResultado.replaceChildren(
      criarElemento('div', { className: CLASSES.grade, filhos: cartoes }),
      criarElemento('div', {
        className: CLASSES.rodape,
        filhos: [
          criarElemento('p', {
            className: CLASSES.cartaoLinha,
            texto: `${itens.length} equipamento(s) disponível(is) para o período escolhido.`,
          }),
          new Botao({
            texto: 'Fazer reserva',
            variante: 'primario',
            aoClicar: () => {
              window.location.hash = `#${ROTA_CLIENTE_NOVA_RESERVA}`
            },
          }).raiz,
        ],
      }),
    )
  }

  private mostrarErroFormulario(mensagem: string | null): void {
    this.areaErroFormulario.textContent = mensagem ?? ''
    this.areaErroFormulario.hidden = mensagem === null
  }
}
