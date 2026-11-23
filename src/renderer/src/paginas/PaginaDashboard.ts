import type {
  Cliente,
  Equipamento,
  Reserva,
  StatusReserva,
} from '../../../shared/contratos/modelos'
import { Componente, criarElemento, substituirConteudo } from '../nucleo'
import { ServicoClientes, ServicoEquipamentos, ServicoReservas } from '../servicos'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  grade: 'grid grid-cols-1 gap-4 md:grid-cols-3',
  cartao: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  rotuloCartao: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  valorCartao: 'mt-2 font-display text-2xl text-grafite',
  gradeTabelas: 'grid grid-cols-1 gap-6 xl:grid-cols-2',
  tituloSecao: 'mb-3 font-display text-lg text-floresta',
  tabelaContainer:
    'w-full overflow-x-auto rounded-card border border-granito/45 bg-superficie shadow-card',
  tabela: 'w-full border-collapse text-left text-sm',
  cabecalhoTabela: 'bg-floresta text-pedra',
  th: 'h-row px-4 text-xs font-semibold uppercase tracking-wider',
  linha: 'h-row border-t border-granito/30 transition-colors hover:bg-pedra/60',
  celula: 'px-4 py-2 text-grafite',
  vazio:
    'flex min-h-40 flex-col items-center justify-center gap-2 rounded-card border border-dashed border-granito/60 bg-pedra/40 p-6 text-center',
  vazioTexto: 'text-sm text-floresta/70',
  erro: 'flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-erro/40 bg-erro-suave p-6 text-center',
  erroTexto: 'max-w-md text-sm text-grafite',
  botao:
    'cursor-pointer rounded-control bg-lima px-4 py-2 text-sm font-semibold text-grafite transition-colors hover:bg-geleira focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  carregando: 'flex min-h-40 items-center justify-center gap-3 text-floresta',
  spinner: 'size-5 animate-spin rounded-full border-2 border-granito/40 border-t-floresta',
  badgeSucesso:
    'inline-flex rounded-pill bg-sucesso-suave px-2.5 py-1 text-xs font-semibold text-sucesso',
  badgeAlerta:
    'inline-flex rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  badgeNeutro: 'inline-flex rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta',
} as const

interface DadosDashboard {
  readonly reservas: readonly Reserva[]
  readonly clientes: readonly Cliente[]
  readonly equipamentos: readonly Equipamento[]
}

export class PaginaDashboard extends Componente {
  private readonly servicoReservas = new ServicoReservas()
  private readonly servicoClientes = new ServicoClientes()
  private readonly servicoEquipamentos = new ServicoEquipamentos()

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
  }

  protected aoMontar(): void {
    void this.carregar()
  }

  private async carregar(): Promise<void> {
    this.mostrarCarregando()
    try {
      const [reservas, clientes, equipamentos] = await Promise.all([
        this.servicoReservas.listar(),
        this.servicoClientes.listar(),
        this.servicoEquipamentos.listar(),
      ])
      this.mostrarDados({ reservas, clientes, equipamentos })
    } catch {
      this.mostrarErro()
    }
  }

  private criarTitulo(): HTMLElement {
    return criarElemento('div', {
      filhos: [
        criarElemento('h2', { className: CLASSES.titulo, texto: 'Dashboard' }),
        criarElemento('p', {
          className: CLASSES.subtitulo,
          texto: 'Reservas do dia e devoluções pendentes.',
        }),
      ],
    })
  }

  private mostrarCarregando(): void {
    const aviso = criarElemento('div', {
      className: CLASSES.carregando,
      atributos: { 'aria-live': 'polite' },
      filhos: [
        criarElemento('span', { className: CLASSES.spinner }),
        criarElemento('span', { className: CLASSES.vazioTexto, texto: 'Carregando painel…' }),
      ],
    })
    substituirConteudo(this.elemento, this.criarTitulo(), aviso)
  }

  private mostrarErro(): void {
    const tentar = criarElemento('button', {
      className: CLASSES.botao,
      atributos: { type: 'button' },
      texto: 'Tentar novamente',
    })
    tentar.addEventListener('click', () => {
      void this.carregar()
    })

    const erro = criarElemento('div', {
      className: CLASSES.erro,
      filhos: [
        criarElemento('p', {
          className: CLASSES.erroTexto,
          texto: 'Não foi possível carregar o painel. Verifique sua conexão e tente novamente.',
        }),
        tentar,
      ],
    })
    substituirConteudo(this.elemento, this.criarTitulo(), erro)
  }

  private mostrarDados(dados: DadosDashboard): void {
    const disponiveis = dados.equipamentos.filter((equipamento) => equipamento.disponivel).length

    const indicadores = criarElemento('div', {
      className: CLASSES.grade,
      filhos: [
        this.criarCartao('Reservas', String(dados.reservas.length)),
        this.criarCartao('Clientes', String(dados.clientes.length)),
        this.criarCartao('Equipamentos disponíveis', String(disponiveis)),
      ],
    })

    const tabelas = criarElemento('div', {
      className: CLASSES.gradeTabelas,
      filhos: [
        this.criarBloco('Reservas', this.criarTabelaReservas(dados)),
        this.criarBloco('Devoluções pendentes', this.criarVazioDevolucoes()),
      ],
    })

    substituirConteudo(this.elemento, this.criarTitulo(), indicadores, tabelas)
  }

  private criarCartao(rotulo: string, valor: string): HTMLElement {
    return criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('p', { className: CLASSES.rotuloCartao, texto: rotulo }),
        criarElemento('p', { className: CLASSES.valorCartao, texto: valor }),
      ],
    })
  }

  private criarBloco(titulo: string, conteudo: Node): HTMLElement {
    return criarElemento('section', {
      filhos: [criarElemento('h3', { className: CLASSES.tituloSecao, texto: titulo }), conteudo],
    })
  }

  private criarTabelaReservas(dados: DadosDashboard): HTMLElement {
    if (dados.reservas.length === 0) {
      return this.criarVazio('Nenhuma reserva cadastrada.')
    }

    const nomesClientes = new Map(dados.clientes.map((cliente) => [cliente.id, cliente.nome]))
    const nomesEquipamentos = new Map(
      dados.equipamentos.map((equipamento) => [equipamento.id, equipamento.nome]),
    )

    const cabecalho = criarElemento('thead', {
      className: CLASSES.cabecalhoTabela,
      filhos: [
        criarElemento('tr', {
          filhos: ['Reserva', 'Cliente', 'Equipamento', 'Início', 'Status'].map((rotulo) =>
            criarElemento('th', {
              className: CLASSES.th,
              texto: rotulo,
              atributos: { scope: 'col' },
            }),
          ),
        }),
      ],
    })

    const corpo = criarElemento('tbody', {
      filhos: dados.reservas.slice(0, 8).map((reserva) =>
        criarElemento('tr', {
          className: CLASSES.linha,
          filhos: [
            `#${reserva.id}`,
            nomesClientes.get(reserva.clienteId) ?? `Cliente #${reserva.clienteId}`,
            nomesEquipamentos.get(reserva.equipamentoId) ?? `Item #${reserva.equipamentoId}`,
            this.formatarData(reserva.inicio),
          ]
            .map((valor) => criarElemento('td', { className: CLASSES.celula, texto: valor }))
            .concat(
              criarElemento('td', {
                className: CLASSES.celula,
                filhos: [this.badge(reserva.status)],
              }),
            ),
        }),
      ),
    })

    return criarElemento('div', {
      className: CLASSES.tabelaContainer,
      filhos: [criarElemento('table', { className: CLASSES.tabela, filhos: [cabecalho, corpo] })],
    })
  }

  private badge(status: StatusReserva): HTMLElement {
    const classe =
      status === 'confirmada'
        ? CLASSES.badgeSucesso
        : status === 'cancelada' || status === 'concluida'
          ? CLASSES.badgeNeutro
          : CLASSES.badgeAlerta
    return criarElemento('span', { className: classe, texto: status })
  }

  private criarVazioDevolucoes(): HTMLElement {
    return this.criarVazio('Nenhuma devolução pendente no momento.')
  }

  private criarVazio(mensagem: string): HTMLElement {
    return criarElemento('div', {
      className: CLASSES.vazio,
      filhos: [criarElemento('p', { className: CLASSES.vazioTexto, texto: mensagem })],
    })
  }

  private formatarData(valor: string): string {
    const data = new Date(valor)
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR')
  }
}
