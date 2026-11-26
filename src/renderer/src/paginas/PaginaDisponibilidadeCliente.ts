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
} as const

export class PaginaDisponibilidadeCliente extends Componente {
  private readonly servico = new EquipamentoServico()
  private readonly campoTipo: Campo
  private readonly campoFim: Campo
  private readonly categoria: Select
  private readonly botaoConsultar: Botao
  private readonly areaErroFormulario: HTMLParagraphElement
  private readonly areaResultado: HTMLElement
  private readonly formulario: HTMLFormElement
  private estado: EstadoConsulta = 'inicial'
  private equipamentos: readonly Equipamento[] = []
  private mensagemErro: string | null = null
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
    this.formulario = formulario
    formulario.addEventListener('submit', this.aoSubmit)
  }

  protected aoMontar(): void {
    this.campoTipo.focar()
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
