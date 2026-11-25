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
import type { ColunaTabela, OpcaoListaSelecionavel, VarianteBotao } from '../componentes'
import {
  Componente,
  criarElemento,
  ehAdministrador,
  observarPerfil,
  registrarAtalhos,
  substituirConteudo,
} from '../nucleo'
import {
  EquipamentoServico,
  ServicoClientes,
  ServicoItensReserva,
  ServicoReservas,
} from '../servicos'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  conteudo: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeContainer: 'max-w-3xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  secao: 'mt-5 border-t border-granito/30 pt-4',
  secaoTopo: 'mb-3 flex flex-wrap items-center justify-between gap-2',
  secaoTitulo: 'font-display text-sm font-semibold text-floresta',
  resumo: 'min-h-16 rounded-card border border-granito/45 bg-pedra p-3 text-sm text-grafite',
  linhaResumo: 'flex items-center justify-between gap-3 py-1',
  leituraLinha: 'mb-2 text-sm text-grafite',
  leituraTitulo: 'font-semibold text-floresta',
  total: 'mt-2 flex items-center justify-between gap-3 border-t border-granito/30 pt-2 font-semibold text-floresta',
  aviso: 'rounded-card border border-alerta/40 bg-alerta-suave px-3 py-2 text-xs text-alerta',
  cardClima:
    'rounded-card border border-erro bg-erro-suave px-4 py-3 text-sm text-erro',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  acoes: 'flex flex-wrap items-center gap-1',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'
const CATEGORIAS: readonly CategoriaEquipamento[] = ['Bicicleta', 'Caiaque', 'Prancha', 'Camping']
const FORMATADOR_MOEDA = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const MS_POR_DIA = 86_400_000

interface FormularioReserva {
  buscaCliente: string
  clienteId: string
  dataInicio: string
  dataFim: string
  categoria: string
}

interface CamposReserva {
  buscaCliente: Campo
  cliente: Select
  dataInicio: Campo
  dataFim: Campo
  categoria: Select
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

function formularioVazio(): FormularioReserva {
  return { buscaCliente: '', clienteId: '', dataInicio: '', dataFim: '', categoria: '' }
}

function moeda(valor: number): string {
  return FORMATADOR_MOEDA.format(valor)
}

function dataLegivel(valor: string): string {
  const data = new Date(`${valor}T12:00:00`)
  if (Number.isNaN(data.getTime())) {
    return '—'
  }
  return data.toLocaleDateString('pt-BR')
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

  private readonly itens = new Map<number, number>()
  private clientes: readonly Cliente[] = []
  private reservas: readonly Reserva[] = []
  private categorias: readonly CategoriaEquipamento[] = []
  private disponiveis: readonly Equipamento[] = []
  private formulario: FormularioReserva = formularioVazio()
  private campos: CamposReserva | null = null
  private lista: ListaSelecionavel<Equipamento> | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null
  private resumoSlot: HTMLElement | null = null
  private totalSlot: HTMLElement | null = null
  private modal: Modal | null = null
  private confirmacaoRapida: (() => void) | null = null
  private selecionadoId: number | null = null
  private editandoId: number | null = null
  private carregando = true
  private falhaLista: string | null = null
  private disponibilidadeCarregando = false
  private disponibilidadeErro: string | null = null

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))

    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => this.novo(),
      aoBuscar: () => this.campos?.buscaCliente.focar(),
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
      aoConfirmar: () => this.abrirConfirmacao(),
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
      const [clientes, reservas, resultadoCategorias] = await Promise.all([
        this.servicoClientes.listar(incluirInativos),
        this.servico.listar(incluirInativos),
        this.servicoEquipamentos.listarCategorias(),
      ])
      this.clientes = clientes
      this.reservas = [...reservas].sort((um, dois) => dois.id - um.id)
      this.categorias = resultadoCategorias.itens
        .map((categoria) => categoria.nome)
        .filter(ehCategoriaEquipamento)
      if (resultadoCategorias.dadosDeExemplo) {
        this.toasts.exibir({
          titulo: 'Categorias temporárias',
          mensagem: 'Não foi possível carregar as categorias; opções de exemplo estão em uso.',
          tom: 'alerta',
        })
      }
      if (this.selecionadoId !== null && !this.reservas.some((item) => item.id === this.selecionadoId)) {
        this.selecionadoId = null
      }
    } catch {
      this.falhaLista = 'Não foi possível carregar reservas e clientes. Tente novamente.'
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
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Reservas' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: admin
                ? 'Disponibilidade, diárias, confirmação e cancelamento.'
                : 'Disponibilidade, diárias e confirmação de locações.',
            }),
          ],
        }),
        new Botao({ texto: 'Nova reserva', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    const conteudo = criarElemento('div', {
      className: CLASSES.conteudo,
      filhos: [this.painelSlot, this.areaTabela],
    })

    substituirConteudo(this.elemento, cabecalho, conteudo)
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private atualizarPainel(): void {
    if (this.painelSlot === null) {
      return
    }

    const editando = this.editandoId !== null
    this.painel = new PainelFormulario({
      id: 'reservas-painel',
      titulo: editando ? `Editar reserva #${this.editandoId ?? ''}` : 'Nova reserva',
      corpo: this.carregando
        ? criarElemento('div')
        : this.construirFormulario(),
      rodape: this.carregando
        ? []
        : [
            new Botao({
              texto: editando ? 'Cancelar' : 'Limpar',
              variante: 'secundario',
              aoClicar: () => this.novo(),
            }).raiz,
            new Botao({
              texto: editando ? 'Salvar alterações' : 'Confirmar reserva',
              aoClicar: () => this.abrirConfirmacao(),
            }).raiz,
          ],
      carregando: this.carregando,
      desabilitado: this.carregando,
      selecionado: this.selecionadoId !== null,
      mensagemCarregando: 'Carregando clientes e reservas…',
    })
    this.painelSlot.replaceChildren(this.painel.raiz)
    if (!this.carregando) {
      this.atualizarOpcoesCliente()
      this.atualizarResumo()
    }
  }

  private construirFormulario(): HTMLElement {
    const estado = this.formulario
    const campos: CamposReserva = {
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
          this.lista?.definirOpcoes(this.opcoesDisponiveis())
        },
      }),
    }
    this.campos = campos

    this.lista = new ListaSelecionavel<Equipamento>({
      id: 'reserva-equipamentos',
      rotulo: 'Equipamentos disponíveis',
      opcoes: this.opcoesDisponiveis(),
      aoSelecionar: (equipamento) => {
        if (this.itens.has(equipamento.id)) {
          this.itens.delete(equipamento.id)
        } else {
          this.itens.set(equipamento.id, equipamento.valorDiaria ?? 0)
        }
        this.lista?.definirSelecionado(null)
        this.lista?.definirOpcoes(this.opcoesDisponiveis())
        this.atualizarResumo()
      },
      tituloVazio: 'Nenhum equipamento disponível para esta data',
      mensagemVazia: 'Escolha outro período ou verifique a conservação dos equipamentos.',
      acaoVazio: {
        texto: 'Ver outra data',
        aoClicar: () => this.campos?.dataInicio.focar(),
      },
      carregando: this.disponibilidadeCarregando,
      mensagemCarregando: 'Consultando disponibilidade…',
      erro: this.disponibilidadeErro ?? undefined,
      aoTentar: () => {
        void this.verDisponibilidade()
      },
    })

    this.resumoSlot = criarElemento('div', {
      className: CLASSES.resumo,
      atributos: { 'aria-live': 'polite' },
    })

    return criarElemento('div', {
      className: CLASSES.gradeContainer,
      filhos: [
        criarElemento('div', {
          className: CLASSES.gradeCampos,
          filhos: [
            campos.buscaCliente.raiz,
            campos.cliente.raiz,
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
                new Botao({
                  texto: 'Ver disponibilidade',
                  variante: 'secundario',
                  aoClicar: () => {
                    void this.verDisponibilidade()
                  },
                }).raiz,
              ],
            }),
            this.lista.raiz,
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

  private opcoesCliente(): readonly { readonly valor: string; readonly rotulo: string }[] {
    const selecionado = this.formulario.clienteId
    const termo = this.formulario.buscaCliente.trim().toLocaleLowerCase('pt-BR')
    return this.clientes
      .filter(
        (cliente) =>
          cliente.id === Number(selecionado) ||
          termo === '' ||
          cliente.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
          cliente.cpf.includes(termo),
      )
      .map((cliente) => ({ valor: String(cliente.id), rotulo: `${cliente.nome} · ${cliente.cpf}` }))
  }

  private atualizarOpcoesCliente(): void {
    if (this.campos === null) {
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
          ? 'Selecionado'
          : equipamento.estadoConservacao,
        desabilitado: equipamento.estadoConservacao === 'Em Manutenção',
        selecionado: this.itens.has(equipamento.id),
      }))
  }

  private atualizarResumo(): void {
    if (this.resumoSlot === null) {
      return
    }
    this.totalSlot = null
    const filhos: Array<Node | string> = []
    const selecionada = this.reservas.find((reserva) => reserva.id === this.selecionadoId)

    if (selecionada !== undefined) {
      filhos.push(
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          filhos: [
            criarElemento('span', {
              className: CLASSES.leituraTitulo,
              texto: `Reserva selecionada #${selecionada.id}: `,
            }),
            `${this.nomeCliente(selecionada.clienteId)} · ${dataLegivel(selecionada.dataInicio)} a ${dataLegivel(selecionada.dataFim)} · ${selecionada.statusReserva}`,
          ],
        }),
      )
      filhos.push(
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          filhos: [
            criarElemento('span', { className: CLASSES.leituraTitulo, texto: 'Previsão: ' }),
            selecionada.previsaoTempo?.trim() || 'Indisponível (a reserva não foi bloqueada).',
          ],
        }),
      )
      if (selecionada.altaDemandaPrevista === true) {
        filhos.push(
          criarElemento('p', {
            className: CLASSES.leituraLinha,
            filhos: [
              criarElemento('span', { className: CLASSES.leituraTitulo, texto: 'Demanda: ' }),
              new Badge({ texto: 'Alta demanda prevista', tom: 'alerta' }).raiz,
            ],
          }),
        )
      }
    }

    if (this.itens.size === 0) {
      filhos.push('Selecione equipamentos na lista acima para montar a reserva.')
      this.resumoSlot.replaceChildren(...filhos)
      return
    }

    filhos.push(
      criarElemento('p', {
        className: CLASSES.leituraLinha,
        texto: `${this.itens.size} item(ns) · ${diasEntre(this.formulario.dataInicio, this.formulario.dataFim)} dia(s)`,
      }),
    )
    for (const [equipamentoId, valorDiaria] of this.itens) {
      const equipamento = this.disponiveis.find((item) => item.id === equipamentoId)
      const campo = new Campo({
        id: `reserva-diaria-${equipamentoId}`,
        rotulo: `Diária — ${equipamento?.nome ?? `Equipamento ${equipamentoId}`}`,
        tipo: 'number',
        valorInicial: String(valorDiaria),
        ajuda: 'Valor acordado por dia; o total é calculado nesta tela.',
        aoAlterar: (valor) => {
          const numero = Number(valor)
          this.itens.set(equipamentoId, Number.isFinite(numero) && numero >= 0 ? numero : 0)
          campo.definirErro(numero >= 0 && Number.isFinite(numero) ? null : 'Informe um valor válido.')
          this.atualizarTotal()
        },
      })
      filhos.push(
        criarElemento('div', {
          className: CLASSES.linhaResumo,
          filhos: [campo.raiz],
        }),
      )
    }

    this.totalSlot = criarElemento('span', { texto: moeda(this.calcularTotal()) })
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
    this.totalSlot.textContent = moeda(this.calcularTotal())
  }

  private calcularTotal(): number {
    const dias = diasEntre(this.formulario.dataInicio, this.formulario.dataFim)
    let total = 0
    for (const valorDiaria of this.itens.values()) {
      total += valorDiaria * dias
    }
    return total
  }

  private async verDisponibilidade(): Promise<void> {
    if (
      !this.validarPeriodo() ||
      this.campos === null ||
      this.campos.dataInicio.valor() === '' ||
      this.campos.dataFim.valor() === ''
    ) {
      this.toasts.exibir({
        titulo: 'Informe o período',
        mensagem: 'Escolha a data de início e de fim antes de consultar a disponibilidade.',
        tom: 'alerta',
      })
      return
    }

    this.disponibilidadeCarregando = true
    this.disponibilidadeErro = null
    this.lista?.definirCarregando(true)
    this.lista?.definirErro(null)

    try {
      this.disponiveis = await this.servicoEquipamentos.listarDisponiveis({
        dataInicio: this.formulario.dataInicio,
        dataFim: this.formulario.dataFim,
        ...(this.editandoId === null ? {} : { reservaId: this.editandoId }),
      })
      const indisponiveis = [...this.itens.keys()].filter(
        (id) => !this.disponiveis.some((equipamento) => equipamento.id === id),
      )
      for (const id of indisponiveis) {
        this.itens.delete(id)
      }
      this.lista?.definirOpcoes(this.opcoesDisponiveis())
      this.lista?.definirCarregando(false)
      this.atualizarResumo()
      if (this.disponiveis.length === 0) {
        this.toasts.exibir({
          titulo: 'Sem disponibilidade',
          mensagem: 'Nenhum equipamento disponível para este período.',
          tom: 'alerta',
        })
      }
    } catch {
      this.disponibilidadeErro = 'Não foi possível consultar a disponibilidade. Tente novamente.'
      this.lista?.definirCarregando(false)
      this.lista?.definirErro(this.disponibilidadeErro)
      this.toasts.exibir({
        titulo: 'Falha na disponibilidade',
        mensagem: this.disponibilidadeErro,
        tom: 'erro',
      })
    } finally {
      this.disponibilidadeCarregando = false
    }
  }

  private atualizarTabela(): void {
    if (this.areaTabela === null) {
      return
    }

    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({
        mensagem: 'Carregando reservas…',
        variante: 'skeleton',
        linhas: 4,
      }).montar(area)
      this.areaTabela.replaceChildren(area)
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
      this.areaTabela.replaceChildren(area)
      return
    }

    if (this.reservas.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhuma reserva lançada',
        mensagem: 'Monte uma nova reserva no painel ao lado.',
        acao: { texto: 'Nova reserva', aoClicar: () => this.novo() },
      }).montar(area)
      this.areaTabela.replaceChildren(area)
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
      linhas: this.reservas.map((reserva) => this.paraLinha(reserva)),
      mensagemVazia: 'Nenhuma reserva encontrada.',
      aoSelecionar: (linha) => this.selecionar(linha.id),
      linhaSelecionada: (linha) => this.selecionadoId === linha.id,
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

  private paraLinha(reserva: Reserva): LinhaReserva {
    return {
      id: reserva.id,
      cliente: this.nomeCliente(reserva.clienteId),
      inicio: dataLegivel(reserva.dataInicio),
      fim: dataLegivel(reserva.dataFim),
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
        void this.editar(id)
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
    }

    if (ehAdministrador() && reserva.statusReserva !== 'Cancelada') {
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
    return container
  }

  private nomeCliente(id: number): string {
    return this.clientes.find((cliente) => cliente.id === id)?.nome ?? `Cliente ${id}`
  }

  private selecionar(id: number): void {
    this.selecionadoId = id
    this.painel?.definirSelecionado(true)
    this.atualizarTabela()
    this.atualizarResumo()
  }

  private novo(): void {
    this.formulario = formularioVazio()
    this.itens.clear()
    this.disponiveis = []
    this.disponibilidadeErro = null
    this.disponibilidadeCarregando = false
    this.selecionadoId = null
    this.editandoId = null
    this.montarEstrutura()
    this.painel?.focarPrimeiroControle()
  }

  private async editar(id: number): Promise<void> {
    if (!ehAdministrador()) {
      this.toasts.exibir({
        mensagem: 'Somente o administrador pode editar reservas.',
        tom: 'alerta',
      })
      return
    }
    try {
      const [reserva, itens] = await Promise.all([
        this.servico.buscarPorId(id),
        this.servicoItens.listar({ reservaId: id }),
      ])
      const estado: FormularioReserva = {
        buscaCliente: '',
        clienteId: String(reserva.clienteId),
        dataInicio: reserva.dataInicio,
        dataFim: reserva.dataFim,
        categoria: '',
      }
      this.formulario = estado
      this.itens.clear()
      for (const item of itens) {
        this.itens.set(item.equipamentoId, item.valorDiaria)
      }
      this.editandoId = id
      this.selecionadoId = id
      this.disponibilidadeErro = null
      this.disponibilidadeCarregando = true
      this.montarEstrutura()
      await this.verDisponibilidade()
    } catch {
      this.disponibilidadeCarregando = false
      this.montarEstrutura()
      this.toasts.exibir({
        titulo: 'Não foi possível abrir',
        mensagem: 'Não foi possível carregar esta reserva. Tente novamente.',
        tom: 'erro',
      })
    }
  }

  private async limparEDestacar(id: number): Promise<void> {
    this.formulario = formularioVazio()
    this.itens.clear()
    this.disponiveis = []
    this.disponibilidadeErro = null
    this.disponibilidadeCarregando = false
    this.editandoId = null
    this.selecionadoId = id
    await this.recarregar()
    this.selecionadoId = id
    this.atualizarPainel()
    this.atualizarTabela()
    this.atualizarResumo()
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
      this.toasts.exibir({
        titulo: 'Reserva inativada',
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
    if (
      this.formulario.buscaCliente !== '' ||
      this.formulario.clienteId !== '' ||
      this.formulario.dataInicio !== '' ||
      this.formulario.dataFim !== '' ||
      this.formulario.categoria !== '' ||
      this.itens.size > 0
    ) {
      this.novo()
      return
    }
    void this.recarregar()
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
    let valido = true
    const clienteId = Number(this.formulario.clienteId)
    if (!Number.isSafeInteger(clienteId) || clienteId <= 0) {
      this.campos?.cliente.definirErro('Selecione um cliente.')
      valido = false
    } else {
      this.campos?.cliente.definirErro(null)
    }
    if (!this.validarPeriodo()) {
      valido = false
    }
    if (this.itens.size === 0) {
      valido = false
    }
    for (const [equipamentoId, valorDiaria] of this.itens) {
      if (!Number.isFinite(valorDiaria) || valorDiaria < 0) {
        valido = false
      }
      const campo = document.getElementById(`reserva-diaria-${equipamentoId}`)
      if (campo instanceof HTMLInputElement && (!Number.isFinite(valorDiaria) || valorDiaria < 0)) {
        campo.setAttribute('aria-invalid', 'true')
      }
    }
    return valido
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
        titulo: 'Revise a reserva',
        mensagem: this.itens.size === 0
          ? 'Selecione ao menos um equipamento e confira os campos destacados.'
          : 'Confira os campos destacados antes de confirmar.',
        tom: 'alerta',
      })
      return
    }
    this.painel?.definirErro(false)

    const itens: readonly ItemReservaEntrada[] = [...this.itens].map(([equipamentoId, valorDiaria]) => ({
      equipamentoId,
      valorDiaria,
    }))
    const dados: ReservaCriarEntrada = {
      clienteId: Number(this.formulario.clienteId),
      dataInicio: this.formulario.dataInicio,
      dataFim: this.formulario.dataFim,
      itens,
    }

    const conteudo = criarElemento('div', {
      filhos: [
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `${this.nomeCliente(dados.clienteId)} · ${dataLegivel(dados.dataInicio)} a ${dataLegivel(dados.dataFim)} · ${itens.length} item(ns).`,
        }),
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Total estimado: ${moeda(this.calcularTotal())}.`,
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto: 'A previsão do tempo é consultada pelo sistema ao confirmar; falha no clima não bloqueia a reserva.',
        }),
      ],
    })

    this.confirmar({
      titulo: 'Confirmar reserva',
      conteudo,
      rotulo: 'Confirmar reserva',
      permitirAtalho: true,
      acao: () => {
        void this.criar(dados)
      },
    })
  }

  private abrirConfirmacaoEdicao(): void {
    if (this.editandoId === null || !ehAdministrador()) {
      return
    }
    if (!this.validar()) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Revise a reserva',
        mensagem: 'Confira cliente, período, itens e diárias destacados.',
        tom: 'alerta',
      })
      return
    }
    this.painel?.definirErro(false)

    const itens: readonly ItemReservaEntrada[] = [...this.itens].map(([equipamentoId, valorDiaria]) => ({
      equipamentoId,
      valorDiaria,
    }))
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
          texto: `${this.nomeCliente(dados.clienteId ?? 0)} · ${dataLegivel(dados.dataInicio ?? '')} a ${dataLegivel(dados.dataFim ?? '')} · ${itens.length} item(ns).`,
        }),
        criarElemento('p', {
          className: CLASSES.leituraLinha,
          texto: `Total estimado: ${moeda(this.calcularTotal())}.`,
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

  private async salvarEdicao(dados: ReservaAtualizarEntrada): Promise<void> {
    try {
      await this.servico.atualizar(dados)
      this.toasts.exibir({
        titulo: 'Reserva atualizada',
        mensagem: `Reserva #${dados.id} atualizada. Status e previsão preservados.`,
        tom: 'sucesso',
      })
      await this.limparEDestacar(dados.id)
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: 'Verifique os dados e tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private async criar(dados: ReservaCriarEntrada): Promise<void> {
    try {
      const criada = await this.servico.criar(dados)
      let confirmada: Reserva = criada
      let falhaConfirmacao = false
      try {
        confirmada = await this.servico.atualizar({ id: criada.id, statusReserva: 'Confirmada' })
      } catch {
        falhaConfirmacao = true
      }
      await this.recarregar()

      if (falhaConfirmacao) {
        this.toasts.exibir({
          titulo: 'Reserva registrada',
          mensagem: `Reserva #${criada.id} criada, mas a confirmação não foi concluída. Tente confirmar novamente na tabela.`,
          tom: 'alerta',
        })
        return
      }

      const previsao = confirmada.previsaoTempo?.trim() ?? ''
      if (previsao === '') {
        this.mostrarAvisoClima(confirmada)
        return
      }

      this.toasts.exibir({
        titulo: 'Reserva confirmada',
        mensagem: `Reserva #${confirmada.id} confirmada. Previsão: ${previsao}`,
        tom: 'sucesso',
      })
      this.novo()
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível confirmar',
        mensagem: 'Verifique os dados e tente novamente em instantes.',
        tom: 'erro',
      })
    }
  }

  private mostrarAvisoClima(reserva: Reserva): void {
    if (this.modal !== null) {
      return
    }
    const conteudo = criarElemento('div', {
      className: CLASSES.cardClima,
      filhos: [
        criarElemento('p', {
          texto: `A reserva #${reserva.id} foi confirmada, mas a previsão do tempo não estava disponível.`,
        }),
        criarElemento('p', {
          texto: 'Você pode tentar consultar novamente ou seguir sem previsão. A locação não fica bloqueada.',
        }),
      ],
    })
    const tentar = new Botao({
      texto: 'Tentar novamente',
      variante: 'secundario',
      aoClicar: () => {
        this.modal?.fechar()
        void this.tentarPrevisao(reserva)
      },
    })
    const seguir = new Botao({
      texto: 'Confirmar sem previsão',
      aoClicar: () => {
        this.modal?.fechar()
        this.toasts.exibir({
          titulo: 'Reserva confirmada',
          mensagem: `Reserva #${reserva.id} confirmada sem previsão do tempo.`,
          tom: 'alerta',
        })
        this.novo()
      },
    })
    const modal = new Modal({
      id: 'reservas-clima',
      titulo: 'Previsão do tempo indisponível',
      conteudo,
      rodape: [tentar.raiz, seguir.raiz],
      aoFechar: () => {
        this.modal = null
        this.confirmacaoRapida = null
      },
    })
    this.modal = modal
    modal.abrir()
  }

  private async tentarPrevisao(reserva: Reserva): Promise<void> {
    try {
      if (reserva.statusReserva === 'Confirmada') {
        await this.servico.atualizar({ id: reserva.id, statusReserva: 'Pendente' })
      }
      const atualizada = await this.servico.atualizar({
        id: reserva.id,
        statusReserva: 'Confirmada',
      })
      await this.recarregar()
      const previsao = atualizada.previsaoTempo?.trim() ?? ''
      this.toasts.exibir({
        titulo: previsao === '' ? 'Previsão ainda indisponível' : 'Previsão atualizada',
        mensagem:
          previsao === ''
            ? 'A reserva segue confirmada; tente novamente mais tarde.'
            : `Reserva #${reserva.id}: ${previsao}`,
        tom: previsao === '' ? 'alerta' : 'sucesso',
      })
    } catch {
      try {
        await this.servico.atualizar({
          id: reserva.id,
          statusReserva: 'Confirmada',
          previsaoTempo: reserva.previsaoTempo,
        })
      } catch {
        // A reserva permanece consultável; o estado real é recarregado abaixo.
      }
      await this.recarregar()
      this.toasts.exibir({
        titulo: 'Não foi possível atualizar',
        mensagem: 'A reserva continua salva. Tente novamente em instantes.',
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
      id: 'reservas-confirmacao',
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
