import type {
  CondicaoTempo,
  DevolucaoPendente,
  RespostaPrevisaoTempo,
  StatusPagamento,
  StatusReserva,
} from '../../../shared/contratos/modelos'
import { Badge, Botao, Carregando, EstadoErro, EstadoVazio, Tabela } from '../componentes'
import type { ColunaTabela, TomBadge } from '../componentes'
import {
  Componente,
  criarElemento,
  criarIcone,
  registrarAtalhos,
  substituirConteudo,
} from '../nucleo'
import { DashboardServico } from '../servicos'
import type { DadosDashboard } from '../servicos'
import { formatadorPtBr, mensagemIntegracao } from '../util'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  acoes: 'flex flex-wrap items-center gap-3',
  banner:
    'flex flex-wrap items-center gap-3 rounded-card border border-alerta/40 bg-alerta-suave px-4 py-3',
  bannerTexto: 'flex-1 text-sm text-alerta',
  gradeKpis: 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4',
  cartao: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  cartaoTopo: 'flex items-start justify-between gap-3',
  rotulo: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  valor: 'mt-3 font-display text-3xl text-grafite',
  icone: 'size-5 shrink-0 stroke-current text-floresta',
  iconeAlerta: 'size-5 shrink-0 stroke-current text-erro',
  rodape: 'mt-2 text-xs text-floresta/70',
  gradeCorpo: 'grid grid-cols-1 gap-6 xl:grid-cols-3',
  colunaAgenda: 'flex flex-col gap-3 xl:col-span-2',
  colunaLateral: 'flex flex-col gap-6',
  tituloSecao: 'font-display text-lg text-floresta',
  descricaoSecao: 'text-xs text-floresta/70',
  climaPrincipal: 'mt-4 flex items-center gap-4',
  climaIcone: 'size-10 shrink-0 stroke-current text-floresta',
  temperatura: 'font-display text-3xl text-grafite',
  condicao: 'text-sm text-grafite',
  previsaoIndisponivel: 'text-sm text-floresta/70',
  detalhes: 'mt-4 grid grid-cols-2 gap-3 border-t border-granito/30 pt-4',
  detalheRotulo: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  detalheValor: 'mt-1 text-sm text-grafite',
  frotaLista: 'mt-4 flex flex-col gap-4',
  frotaItem: 'flex flex-col gap-2',
  frotaLinha: 'flex items-center justify-between gap-3',
  frotaNome: 'text-sm text-grafite',
  frotaNumero: 'font-display text-base text-floresta',
  trilha: 'h-2 w-full overflow-hidden rounded-pill bg-pedra',
  listaDevolucoes: 'mt-4 flex flex-col gap-2',
  devolucaoLinha: 'flex flex-wrap items-center justify-between gap-2 rounded-control bg-pedra/40 px-3 py-2',
  devolucaoTexto: 'text-sm text-grafite',
  devolucaoMulta: 'text-sm font-semibold text-erro',
} as const

type CorFrota = 'disponivel' | 'reservado' | 'manutencao'

/** Variantes completas: o Tailwind v4 detecta cada classe no código-fonte. */
const BARRAS: Readonly<Record<CorFrota, readonly string[]>> = {
  disponivel: [
    'h-full rounded-pill bg-sucesso w-0',
    'h-full rounded-pill bg-sucesso w-1/4',
    'h-full rounded-pill bg-sucesso w-1/2',
    'h-full rounded-pill bg-sucesso w-3/4',
    'h-full rounded-pill bg-sucesso w-full',
  ],
  reservado: [
    'h-full rounded-pill bg-alerta w-0',
    'h-full rounded-pill bg-alerta w-1/4',
    'h-full rounded-pill bg-alerta w-1/2',
    'h-full rounded-pill bg-alerta w-3/4',
    'h-full rounded-pill bg-alerta w-full',
  ],
  manutencao: [
    'h-full rounded-pill bg-granito w-0',
    'h-full rounded-pill bg-granito w-1/4',
    'h-full rounded-pill bg-granito w-1/2',
    'h-full rounded-pill bg-granito w-3/4',
    'h-full rounded-pill bg-granito w-full',
  ],
}

const ICONES = {
  reservas:
    'M6 3v3M18 3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  devolucoes: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  equipamentos: 'M20 7l-8-4-8 4v10l8 4 8-4zM4 7l8 4 8-4M12 11v10',
  faturamento: 'M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
  financeiro: 'M3 6h18v12H3zM3 10h18M7 15h4',
} as const

const ICONES_CLIMA: Readonly<Record<CondicaoTempo, string>> = {
  Ensolarado:
    'M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M18.4 5.6l1.4-1.4M4.2 19.8l1.4-1.4M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10z',
  Nublado: 'M7 18h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 11a3.5 3.5 0 0 0 1 7z',
  Chuvoso:
    'M7 15h10a4 4 0 0 0 .6-8A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7zM8 19l-1 2M13 19l-1 2M18 19l-1 2',
  Outro: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v5M12 16h.01',
}

type TipoAgenda = 'retirada' | 'devolucao'

interface LinhaAgenda {
  readonly horario: string
  readonly cliente: string
  readonly equipamento: string
  readonly tipo: TipoAgenda
  readonly status: StatusReserva
  readonly statusPagamento: StatusPagamento
  readonly valorMulta: number
}

interface FrotaLinha {
  readonly nome: string
  readonly numero: string
  readonly parcial: number
  readonly cor: CorFrota
}

interface OpcoesKpi {
  readonly rotulo: string
  readonly valor: string
  readonly icone: string
  readonly classeIcone: string
  readonly destaque?: HTMLElement
  readonly rodape?: string
}

const COLUNAS: readonly ColunaTabela<LinhaAgenda>[] = [
  { chave: 'horario', rotulo: 'Horário', ordenavel: true },
  { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
  { chave: 'equipamento', rotulo: 'Equipamento', ordenavel: true },
  {
    chave: 'tipo',
    rotulo: 'Tipo',
    celula: (linha) =>
      new Badge({
        texto: linha.tipo === 'retirada' ? 'Retirada' : 'Devolução',
        tom: linha.tipo === 'retirada' ? 'neutro' : 'alerta',
      }).raiz,
  },
  {
    chave: 'status',
    rotulo: 'Status',
    celula: (linha) =>
      new Badge({ texto: rotuloStatus(linha.status), tom: tomStatus(linha.status) }).raiz,
  },
  {
    chave: 'statusPagamento',
    rotulo: 'Pagamento / Multa',
    celula: (linha) =>
      new Badge({
        texto: rotuloPagamento(linha),
        tom: tomPagamento(linha),
      }).raiz,
  },
]

function rotuloStatus(status: StatusReserva): string {
  const rotulos: Readonly<Record<StatusReserva, string>> = {
    Pendente: 'Pendente',
    Confirmada: 'Confirmada',
    Cancelada: 'Cancelada',
    Concluída: 'Concluída',
  }
  return rotulos[status]
}

function tomStatus(status: StatusReserva): TomBadge {
  if (status === 'Confirmada' || status === 'Concluída') {
    return 'sucesso'
  }
  return status === 'Pendente' ? 'alerta' : 'neutro'
}

function rotuloPagamento(linha: LinhaAgenda): string {
  if (linha.valorMulta > 0) {
    return `Multa · ${formatadorPtBr.moeda(linha.valorMulta)}`
  }
  const rotulos: Readonly<Record<StatusPagamento, string>> = {
    Pago: 'Pago',
    Pendente: 'Pendente',
    Estornado: 'Estornado',
  }
  return rotulos[linha.statusPagamento]
}

function tomPagamento(linha: LinhaAgenda): TomBadge {
  if (linha.valorMulta > 0) {
    return 'erro'
  }
  if (linha.statusPagamento === 'Pago') {
    return 'sucesso'
  }
  return linha.statusPagamento === 'Estornado' ? 'neutro' : 'alerta'
}

function pluralizar(quantidade: number, singular: string, plural: string): string {
  return `${quantidade} ${quantidade === 1 ? singular : plural}`
}

function recomendacaoClima(condicao: CondicaoTempo | null): string {
  if (condicao === 'Chuvoso') return 'Leve capa de chuva e calçado aderente.'
  if (condicao === 'Ensolarado') return 'Bom para trilha e ciclismo; use proteção solar.'
  if (condicao === 'Nublado') return 'Condição estável para atividades ao ar livre.'
  return 'Confira as condições antes de retirar os equipamentos.'
}

export class PaginaDashboard extends Componente {
  private readonly servico = new DashboardServico()
  private readonly cancelarAtalhos: () => void

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => {
        window.location.hash = '#/reservas/nova'
      },
      aoBuscar: () => {},
      aoRecarregar: () => {
        void this.carregar()
      },
      aoEditar: () => {},
      aoConfirmar: () => {},
      aoCancelar: () => {},
      emCampo: () => false,
      modalAberto: () => false,
    })
  }

  protected aoMontar(): void {
    void this.carregar()
  }

  protected aoDesmontar(): void {
    this.cancelarAtalhos()
  }

  private async carregar(): Promise<void> {
    this.mostrarCarregando()
    try {
      const dados = await this.servico.carregar()
      this.mostrarDados(dados)
    } catch {
      this.mostrarErro()
    }
  }

  private criarCabecalho(feriadoHoje: string | null = null): HTMLElement {
    const novaReserva = new Botao({
      texto: 'Nova reserva (Ctrl+N)',
      aoClicar: () => {
        window.location.hash = '#/reservas/nova'
      },
    })
    const registrarDevolucao = new Botao({
      texto: 'Registrar devolução',
      variante: 'secundario',
      aoClicar: () => {
        window.location.hash = '#/devolucoes'
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
              texto:
                feriadoHoje === null
                  ? 'O que acontece hoje na locadora, em um só lugar.'
                  : `Hoje é ${feriadoHoje}. Veja o que acontece na locadora, em um só lugar.`,
            }),
          ],
        }),
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [novaReserva.raiz, registrarDevolucao.raiz],
        }),
      ],
    })
  }

  private criarBanner(dados: DadosDashboard): HTMLElement {
    const textos = dados.resumo.integracoesIndisponiveis.map((item) =>
      mensagemIntegracao(item.motivo, item.integracao),
    )
    return criarElemento('div', {
      className: CLASSES.banner,
      atributos: { role: 'status' },
      filhos: [
        new Badge({ texto: 'integração indisponível', tom: 'alerta' }).raiz,
        criarElemento('p', {
          className: CLASSES.bannerTexto,
          texto: `${textos.join(' ')} Os dados do sistema permanecem disponíveis.`,
        }),
      ],
    })
  }

  private mostrarCarregando(): void {
    const area = criarElemento('div')
    new Carregando({ mensagem: 'Carregando painel…' }).montar(area)
    substituirConteudo(this.elemento, this.criarCabecalho(), area)
  }

  private mostrarErro(): void {
    const area = criarElemento('div')
    new EstadoErro({
      mensagem: 'Não foi possível carregar o painel.',
      detalhes: 'Tente novamente. Se o erro continuar, verifique a aplicação.',
      aoTentar: () => {
        void this.carregar()
      },
    }).montar(area)
    substituirConteudo(this.elemento, this.criarCabecalho(), area)
  }

  private mostrarDados(dados: DadosDashboard): void {
    const filhos: Array<Node> = [this.criarCabecalho(dados.feriadoHoje)]
    if (dados.resumo.integracoesIndisponiveis.length > 0) {
      filhos.push(this.criarBanner(dados))
    }

    const { contadores, faturamento, financeiro } = dados.resumo
    const atrasadas = contadores.devolucoesAtrasadas
    const multas = dados.resumo.devolucoesPendentes
      .filter((devolucao) => devolucao.atrasada)
      .reduce((total, devolucao) => total + devolucao.valorMultaEstimado, 0)
    const disponiveis = dados.equipamentos.filter(
      (equipamento) =>
        equipamento.disponibilidade === 'Disponível' &&
        equipamento.estadoConservacao !== 'Em Manutenção',
    ).length

    const kpis = criarElemento('div', {
      className: CLASSES.gradeKpis,
      filhos: [
        this.criarKpi({
          rotulo: 'Retiradas hoje',
          valor: String(contadores.reservasHoje),
          icone: ICONES.reservas,
          classeIcone: CLASSES.icone,
          rodape: 'Reservas com início na data de hoje',
        }),
        this.criarKpi({
          rotulo: 'Devoluções pendentes',
          valor: String(contadores.devolucoesPendentes),
          icone: ICONES.devolucoes,
          classeIcone: atrasadas > 0 ? CLASSES.iconeAlerta : CLASSES.icone,
          destaque:
            atrasadas > 0
              ? new Badge({
                  texto: `${pluralizar(atrasadas, 'atrasada', 'atrasadas')} · ${formatadorPtBr.moeda(multas)} em multas`,
                  tom: 'erro',
                }).raiz
              : undefined,
          rodape: 'Itens ainda não devolvidos',
        }),
        this.criarKpi({
          rotulo: 'Equipamentos disponíveis',
          valor: String(disponiveis),
          icone: ICONES.equipamentos,
          classeIcone: CLASSES.icone,
          rodape: `de ${dados.equipamentos.length} itens no acervo`,
        }),
        this.criarKpi({
          rotulo: 'Faturamento do dia',
          valor: formatadorPtBr.moeda(faturamento.valor),
          icone: ICONES.faturamento,
          classeIcone: CLASSES.icone,
          destaque: new Badge({
            texto: faturamento.estimado ? 'estimativa' : 'confirmado',
            tom: faturamento.estimado ? 'alerta' : 'sucesso',
          }).raiz,
          rodape: 'Receitas apuradas pelo sistema',
        }),
      ],
    })

    const corpo = criarElemento('div', {
      className: CLASSES.gradeCorpo,
      filhos: [
        criarElemento('div', {
          className: CLASSES.colunaAgenda,
          filhos: [
            this.criarAgenda(dados),
            this.criarDevolucoesPendentes(dados.resumo.devolucoesPendentes),
          ],
        }),
        criarElemento('div', {
          className: CLASSES.colunaLateral,
          filhos: [
            this.criarClima(dados.previsao),
            this.criarFrota(dados),
            ...(financeiro === null ? [] : [this.criarFinanceiro(financeiro)]),
          ],
        }),
      ],
    })

    filhos.push(kpis, corpo)
    substituirConteudo(this.elemento, ...filhos)
  }

  private criarKpi(opcoes: OpcoesKpi): HTMLElement {
    const filhos: Array<Node> = [
      criarElemento('div', {
        className: CLASSES.cartaoTopo,
        filhos: [
          criarElemento('p', { className: CLASSES.rotulo, texto: opcoes.rotulo }),
          criarIcone(opcoes.icone, opcoes.classeIcone),
        ],
      }),
      criarElemento('p', { className: CLASSES.valor, texto: opcoes.valor }),
    ]
    if (opcoes.destaque !== undefined) {
      filhos.push(opcoes.destaque)
    }
    if (opcoes.rodape !== undefined) {
      filhos.push(criarElemento('p', { className: CLASSES.rodape, texto: opcoes.rodape }))
    }

    return criarElemento('article', { className: CLASSES.cartao, filhos })
  }

  private criarAgenda(dados: DadosDashboard): HTMLElement {
    const secao = criarElemento('section', {
      className: CLASSES.colunaAgenda,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Agenda do dia' }),
            criarElemento('p', {
              className: CLASSES.descricaoSecao,
              texto: `Retiradas e devoluções programadas para ${dados.resumo.data}.`,
            }),
          ],
        }),
      ],
    })

    const linhas = this.montarLinhasAgenda(dados)
    if (linhas.length === 0) {
      const vazio = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'reservas',
        titulo: 'Nenhuma reserva para hoje',
        mensagem: 'Cadastre uma nova reserva para começar o dia.',
        acao: {
          texto: 'Cadastrar nova reserva',
          aoClicar: () => {
            window.location.hash = '#/reservas/nova'
          },
        },
      }).montar(vazio)
      secao.append(vazio)
      return secao
    }

    secao.append(
      new Tabela<LinhaAgenda>({
        colunas: COLUNAS,
        linhas,
        mensagemVazia: 'Nenhuma reserva para esta data.',
      }).raiz,
    )
    return secao
  }

  private montarLinhasAgenda(dados: DadosDashboard): readonly LinhaAgenda[] {
    const hoje = dados.resumo.data
    const nomesClientes = new Map(dados.clientes.map((cliente) => [cliente.id, cliente.nome]))
    const nomesEquipamentos = new Map(
      dados.equipamentos.map((equipamento) => [equipamento.id, equipamento.nome]),
    )
    const equipamentosPorReserva = new Map<number, number>()
    for (const item of dados.itensReserva) {
      if (!equipamentosPorReserva.has(item.reservaId)) {
        equipamentosPorReserva.set(item.reservaId, item.equipamentoId)
      }
    }
    const pagamentos = new Map(dados.pagamentos.map((item) => [item.reservaId, item]))

    return dados.reservas
      .filter(
        (reserva) =>
          reserva.statusReserva !== 'Cancelada' &&
          (reserva.dataInicio === hoje || reserva.dataFim === hoje),
      )
      .map((reserva) => {
        const equipamentoId = equipamentosPorReserva.get(reserva.id)
        const pagamento = pagamentos.get(reserva.id)
        return {
          horario: '—',
          cliente: nomesClientes.get(reserva.clienteId) ?? `Cliente #${reserva.clienteId}`,
          equipamento:
            equipamentoId === undefined
              ? 'Item não informado'
              : (nomesEquipamentos.get(equipamentoId) ?? `Item #${equipamentoId}`),
          tipo: reserva.dataFim === hoje ? ('devolucao' as const) : ('retirada' as const),
          status: reserva.statusReserva,
          statusPagamento: pagamento?.statusPagamento ?? ('Pendente' as const),
          valorMulta: pagamento?.valorMulta ?? 0,
        }
      })
  }

  private criarDevolucoesPendentes(itens: readonly DevolucaoPendente[]): HTMLElement {
    const cartao = criarElemento('section', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Devoluções pendentes' }),
        criarElemento('p', {
          className: CLASSES.descricaoSecao,
          texto: 'Multas estimadas pelo sistema; o valor final é calculado na devolução.',
        }),
      ],
    })
    if (itens.length === 0) {
      cartao.append(
        criarElemento('p', {
          className: CLASSES.previsaoIndisponivel,
          texto: 'Nenhuma devolução pendente.',
        }),
      )
      return cartao
    }
    cartao.append(
      criarElemento('div', {
        className: CLASSES.listaDevolucoes,
        filhos: itens.map((item) =>
          criarElemento('div', {
            className: CLASSES.devolucaoLinha,
            filhos: [
              criarElemento('span', {
                className: CLASSES.devolucaoTexto,
                texto: `${item.clienteNome} · ${item.equipamentoNome ?? 'item não informado'} · prevista ${item.dataPrevista}${item.atrasada ? ` · ${pluralizar(item.diasAtraso, 'dia', 'dias')} de atraso` : ''}`,
              }),
              item.valorMultaEstimado > 0
                ? criarElemento('span', {
                    className: CLASSES.devolucaoMulta,
                    texto: formatadorPtBr.moeda(item.valorMultaEstimado),
                  })
                : new Badge({ texto: 'No prazo', tom: 'sucesso' }).raiz,
            ],
          }),
        ),
      }),
    )
    return cartao
  }

  private criarClima(previsao: RespostaPrevisaoTempo): HTMLElement {
    const disponivel = previsao.estado === 'disponivel'
    const condicao = disponivel ? previsao.condicao : null
    const icone =
      condicao === null || condicao === 'Outro'
        ? criarElemento('span', { className: CLASSES.previsaoIndisponivel, texto: '—' })
        : criarIcone(ICONES_CLIMA[condicao], CLASSES.climaIcone)

    const descricao = disponivel
      ? (previsao.descricao ?? 'Sem descrição informada pelo serviço.')
      : mensagemIntegracao(previsao.motivo, 'previsão do tempo')
    const temperatura = disponivel
      ? this.formatarTemperatura(previsao.temperaturaMinC, previsao.temperaturaMaxC)
      : '—'
    const vento = disponivel
      ? previsao.ventoKmH === null
        ? '—'
        : `${previsao.ventoKmH} km/h`
      : '—'

    return criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('div', {
          className: CLASSES.cartaoTopo,
          filhos: [
            criarElemento('h3', {
              className: CLASSES.tituloSecao,
              texto: 'Previsão do tempo',
            }),
            disponivel
              ? new Badge({ texto: 'atualizado', tom: 'sucesso' }).raiz
              : new Badge({ texto: 'indisponível', tom: 'alerta' }).raiz,
          ],
        }),
        criarElemento('div', {
          className: CLASSES.climaPrincipal,
          filhos: [
            icone,
            criarElemento('div', {
              filhos: [
                criarElemento('p', { className: CLASSES.temperatura, texto: temperatura }),
                criarElemento('p', {
                  className: disponivel ? CLASSES.condicao : CLASSES.previsaoIndisponivel,
                  texto: descricao,
                }),
              ],
            }),
          ],
        }),
        criarElemento('dl', {
          className: CLASSES.detalhes,
          filhos: [
            this.criarDetalhe('Vento', vento),
            this.criarDetalhe(
              'Recomendação',
              disponivel ? recomendacaoClima(condicao) : 'A locação não fica bloqueada.',
            ),
          ],
        }),
      ],
    })
  }

  private criarDetalhe(rotulo: string, valor: string): HTMLElement {
    return criarElemento('div', {
      filhos: [
        criarElemento('dt', { className: CLASSES.detalheRotulo, texto: rotulo }),
        criarElemento('dd', { className: CLASSES.detalheValor, texto: valor }),
      ],
    })
  }

  private formatarTemperatura(minima: number | null, maxima: number | null): string {
    if (minima === null && maxima === null) {
      return '—'
    }
    if (minima === null) {
      return `${String(maxima)} °C`
    }
    if (maxima === null) {
      return `${String(minima)} °C`
    }
    return minima === maxima ? `${String(minima)} °C` : `${String(minima)}–${String(maxima)} °C`
  }

  private criarFrota(dados: DadosDashboard): HTMLElement {
    const { equipamentos, resumo } = dados
    const total = equipamentos.length
    const manutencao = resumo.contadores.equipamentosEmManutencao
    const disponivel = equipamentos.filter(
      (equipamento) =>
        equipamento.disponibilidade === 'Disponível' &&
        equipamento.estadoConservacao !== 'Em Manutenção',
    ).length
    const reservado = equipamentos.filter(
      (equipamento) =>
        equipamento.disponibilidade === 'Indisponível' &&
        equipamento.estadoConservacao !== 'Em Manutenção',
    ).length
    const itens: readonly FrotaLinha[] = [
      { nome: 'Disponível', numero: String(disponivel), parcial: disponivel, cor: 'disponivel' },
      { nome: 'Reservado', numero: String(reservado), parcial: reservado, cor: 'reservado' },
      { nome: 'Manutenção', numero: String(manutencao), parcial: manutencao, cor: 'manutencao' },
    ]

    return criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Status da frota' }),
        criarElemento('p', {
          className: CLASSES.descricaoSecao,
          texto: 'Distribuição real dos equipamentos cadastrados.',
        }),
        criarElemento('div', {
          className: CLASSES.frotaLista,
          filhos: itens.map((item) => this.criarLinhaFrota(item, total)),
        }),
      ],
    })
  }

  private criarFinanceiro(
    financeiro: NonNullable<DadosDashboard['resumo']['financeiro']>,
  ): HTMLElement {
    const itens: readonly (readonly [string, number])[] = [
      ['Recebido', financeiro.recebido],
      ['A pagar', financeiro.aPagar],
      ['Multas', financeiro.multas],
    ]
    return criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Financeiro' }),
        criarElemento('div', {
          className: CLASSES.frotaLista,
          filhos: itens.map(([rotulo, valor]) =>
            criarElemento('div', {
              className: CLASSES.frotaLinha,
              filhos: [
                criarElemento('span', { className: CLASSES.frotaNome, texto: rotulo }),
                criarElemento('span', {
                  className: CLASSES.frotaNumero,
                  texto: formatadorPtBr.moeda(valor),
                }),
              ],
            }),
          ),
        }),
      ],
    })
  }

  private criarLinhaFrota(item: FrotaLinha, total: number): HTMLElement {
    return criarElemento('div', {
      className: CLASSES.frotaItem,
      filhos: [
        criarElemento('div', {
          className: CLASSES.frotaLinha,
          filhos: [
            criarElemento('span', { className: CLASSES.frotaNome, texto: item.nome }),
            criarElemento('span', { className: CLASSES.frotaNumero, texto: item.numero }),
          ],
        }),
        criarElemento('div', {
          className: CLASSES.trilha,
          atributos: { role: 'presentation' },
          filhos: [
            criarElemento('div', {
              className: this.classeBarra(item.cor, item.parcial, total),
            }),
          ],
        }),
      ],
    })
  }

  private classeBarra(cor: CorFrota, parcial: number, total: number): string {
    const variantes = BARRAS[cor]
    if (total <= 0 || parcial <= 0) {
      return variantes[0] ?? 'h-full rounded-pill bg-granito w-0'
    }
    const proporcao = parcial / total
    const indice = proporcao >= 0.875 ? 4 : proporcao >= 0.625 ? 3 : proporcao >= 0.375 ? 2 : 1
    return variantes[indice] ?? 'h-full rounded-pill bg-granito w-full'
  }
}
