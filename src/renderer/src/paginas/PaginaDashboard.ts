import type {
  Cliente,
  Equipamento,
  Reserva,
  StatusReserva,
} from '../../../shared/contratos/modelos'
import { Badge, Botao, Carregando, EstadoErro, EstadoVazio, Tabela } from '../componentes'
import type { ColunaTabela, TomBadge } from '../componentes'
import { Componente, criarElemento, substituirConteudo } from '../nucleo'
import { EquipamentoServico, ServicoClientes, ServicoReservas } from '../servicos'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  cabecalho: 'flex items-start justify-between gap-4',
  grade: 'grid grid-cols-1 gap-4 md:grid-cols-3',
  cartao: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  rotuloCartao: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  valorCartao: 'mt-2 font-display text-2xl text-grafite',
  gradeTabelas: 'grid grid-cols-1 gap-6 xl:grid-cols-2',
  tituloSecao: 'mb-3 font-display text-lg text-floresta',
} as const

interface LinhaReserva {
  readonly reserva: string
  readonly cliente: string
  readonly equipamento: string
  readonly inicio: string
  readonly status: StatusReserva
}

interface DadosDashboard {
  readonly reservas: readonly Reserva[]
  readonly clientes: readonly Cliente[]
  readonly equipamentos: readonly Equipamento[]
}

function tomStatus(status: StatusReserva): TomBadge {
  if (status === 'confirmada') {
    return 'sucesso'
  }
  if (status === 'pendente') {
    return 'alerta'
  }
  return 'neutro'
}

const COLUNAS: readonly ColunaTabela<LinhaReserva>[] = [
  { chave: 'reserva', rotulo: 'Reserva', ordenavel: true },
  { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
  { chave: 'equipamento', rotulo: 'Equipamento', ordenavel: true },
  { chave: 'inicio', rotulo: 'Início', ordenavel: true },
  {
    chave: 'status',
    rotulo: 'Status',
    celula: (linha) => new Badge({ texto: linha.status, tom: tomStatus(linha.status) }).raiz,
  },
]

export class PaginaDashboard extends Componente {
  private readonly servicoReservas = new ServicoReservas()
  private readonly servicoClientes = new ServicoClientes()
  private readonly servicoEquipamentos = new EquipamentoServico()

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
  }

  protected aoMontar(): void {
    void this.carregar()
  }

  private async carregar(): Promise<void> {
    this.mostrarCarregando()
    try {
      const [reservas, clientes, resultadoEquipamentos] = await Promise.all([
        this.servicoReservas.listar(),
        this.servicoClientes.listar(),
        this.servicoEquipamentos.listar(),
      ])
      this.mostrarDados({
        reservas,
        clientes,
        equipamentos: resultadoEquipamentos.itens,
      })
    } catch {
      this.mostrarErro()
    }
  }

  private criarTitulo(): HTMLElement {
    const novaReserva = new Botao({
      texto: 'Nova reserva',
      aoClicar: () => {
        window.location.hash = '#/reservas'
      },
    })

    return criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Dashboard' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Reservas do dia e devoluções pendentes.',
            }),
          ],
        }),
        novaReserva.raiz,
      ],
    })
  }

  private mostrarCarregando(): void {
    const area = criarElemento('div')
    new Carregando({ mensagem: 'Carregando painel…' }).montar(area)
    substituirConteudo(this.elemento, this.criarTitulo(), area)
  }

  private mostrarErro(): void {
    const area = criarElemento('div')
    new EstadoErro({
      mensagem: 'Não foi possível carregar o painel.',
      detalhes: 'Verifique sua conexão e tente novamente.',
      aoTentar: () => {
        void this.carregar()
      },
    }).montar(area)
    substituirConteudo(this.elemento, this.criarTitulo(), area)
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
        this.criarBloco('Reservas', this.criarConteudoReservas(dados)),
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

  private criarConteudoReservas(dados: DadosDashboard): HTMLElement {
    if (dados.reservas.length === 0) {
      return this.criarVazio('Nenhuma reserva cadastrada.')
    }

    const nomesClientes = new Map(dados.clientes.map((cliente) => [cliente.id, cliente.nome]))
    const nomesEquipamentos = new Map(
      dados.equipamentos.map((equipamento) => [equipamento.id, equipamento.nome]),
    )

    const linhas: LinhaReserva[] = dados.reservas.slice(0, 8).map((reserva) => ({
      reserva: `#${reserva.id}`,
      cliente: nomesClientes.get(reserva.clienteId) ?? `Cliente #${reserva.clienteId}`,
      equipamento: nomesEquipamentos.get(reserva.equipamentoId) ?? `Item #${reserva.equipamentoId}`,
      inicio: this.formatarData(reserva.inicio),
      status: reserva.status,
    }))

    return new Tabela<LinhaReserva>({
      colunas: COLUNAS,
      linhas,
      mensagemVazia: 'Nenhuma reserva cadastrada.',
    }).raiz
  }

  private criarVazioDevolucoes(): HTMLElement {
    return this.criarVazio('Nenhuma devolução pendente no momento.')
  }

  private criarVazio(mensagem: string): HTMLElement {
    return new EstadoVazio({
      titulo: 'Nada por aqui',
      mensagem,
    }).raiz
  }

  private formatarData(valor: string): string {
    const data = new Date(valor)
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR')
  }
}
