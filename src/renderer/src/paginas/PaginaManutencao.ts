import type {
  Equipamento,
  Fornecedor,
  OrdemManutencao,
  StatusOrdemManutencao,
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
import type { ColunaTabela, OpcaoSelect, TomBadge } from '../componentes'
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
  ServicoFornecedores,
  ServicoManutencao,
} from '../servicos'
import { filtrarPorStatus, filtrarPorTexto, formatadorPtBr, mensagemErroOperacao } from '../util'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoSemPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
  avisoErro: 'text-sm text-grafite',
} as const

const STATUS: readonly StatusOrdemManutencao[] = ['Aberta', 'Em andamento', 'Concluída']

function ehStatus(valor: string): valor is StatusOrdemManutencao {
  return STATUS.some((status) => status === valor)
}

function tomStatus(status: StatusOrdemManutencao): TomBadge {
  if (status === 'Concluída') {
    return 'sucesso'
  }
  return status === 'Em andamento' ? 'alerta' : 'neutro'
}

const COLUNAS: readonly ColunaTabela<OrdemManutencao>[] = [
  { chave: 'id', rotulo: 'Ordem', ordenavel: true, celula: (linha) => `#${String(linha.id)}` },
  { chave: 'descricao', rotulo: 'Descrição', ordenavel: true },
  { chave: 'dataEnvio', rotulo: 'Envio', ordenavel: true },
  {
    chave: 'status',
    rotulo: 'Status',
    ordenavel: true,
    celula: (linha) => new Badge({ texto: linha.status, tom: tomStatus(linha.status) }).raiz,
  },
  {
    chave: 'custo',
    rotulo: 'Custo',
    alinhamento: 'direita',
    celula: (linha) => (linha.custo === null ? '—' : formatadorPtBr.moeda(linha.custo)),
  },
]

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

interface Campos {
  equipamento: Select
  fornecedor: Select
  descricao: Campo
  dataEnvio: Campo
  dataRetornoPrevista: Campo
  custo: Campo
  status: Select
}

export class PaginaManutencao extends Componente {
  private readonly servico = new ServicoManutencao()
  private readonly servicoEquipamentos = new EquipamentoServico()
  private readonly servicoFornecedores = new ServicoFornecedores()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private registros: readonly OrdemManutencao[] = []
  private equipamentos: readonly Equipamento[] = []
  private fornecedores: readonly Fornecedor[] = []
  private selecionado: OrdemManutencao | null = null
  private editandoId: number | null = null
  private busca = ''
  private status = ''
  private carregando = true
  private salvando = false
  private falhaLista: string | null = null
  private modal: Modal | null = null
  private campoBusca: Campo | null = null
  private selectStatus: Select | null = null
  private campos: Campos | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
    this.cancelarAtalhos = registrarAtalhos({
      aoNovo: () => this.novo(),
      aoBuscar: () => this.campoBusca?.focar(),
      aoRecarregar: () => {
        void this.recarregar()
      },
      aoEditar: () => this.editarSelecionado(),
      aoConfirmar: () => {
        void this.salvar()
      },
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
      const [ordens, equipamentos, fornecedores] = await Promise.all([
        this.servico.listar({ incluirInativos: true }),
        this.servicoEquipamentos.listar(),
        this.servicoFornecedores.listar(),
      ])
      this.registros = ordens
      this.equipamentos = equipamentos
      this.fornecedores = fornecedores
    } catch {
      this.registros = []
      this.equipamentos = []
      this.fornecedores = []
      this.falhaLista = 'Não foi possível carregar a manutenção. Tente novamente.'
      this.toasts.exibir({ titulo: 'Falha ao carregar', mensagem: this.falhaLista, tom: 'erro' })
    } finally {
      this.carregando = false
      if (this.selecionado !== null) {
        const atual = this.registros.find((item) => item.id === this.selecionado?.id)
        this.selecionado = atual ?? null
        if (atual === undefined) {
          this.editandoId = null
        }
      }
      this.montarEstrutura()
    }
  }

  private montarEstrutura(): void {
    if (!ehAdministrador()) {
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'equipamentos',
        titulo: 'Área administrativa',
        mensagem: 'Somente o administrador pode abrir e concluir ordens de manutenção.',
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

    this.campoBusca = new Campo({
      id: 'manutencao-busca',
      rotulo: 'Buscar ordem',
      placeholder: 'Descrição ou equipamento',
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarTabela()
      },
    })
    this.selectStatus = new Select({
      id: 'manutencao-status-filtro',
      rotulo: 'Status',
      valorInicial: this.status,
      placeholder: 'Todos os status',
      opcoes: STATUS.map((item) => ({ valor: item, rotulo: item })),
      aoAlterar: (valor) => {
        this.status = valor
        this.atualizarTabela()
      },
    })

    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Manutenção' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Ordens de manutenção da frota.',
            }),
          ],
        }),
        new Botao({ texto: 'Nova ordem', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    substituirConteudo(
      this.elemento,
      cabecalho,
      criarElemento('div', {
        className: CLASSES.filtros,
        filhos: [this.campoBusca.raiz, this.selectStatus.raiz],
      }),
      criarElemento('div', {
        className: CLASSES.conteudoComPainel,
        filhos: [this.areaTabela, this.painelSlot],
      }),
    )
    this.montarTabela()
    this.montarPainel()
  }

  private atualizarTabela(): void {
    this.montarTabela()
  }

  private montarTabela(): void {
    if (this.areaTabela === null) {
      return
    }
    this.areaTabela.replaceChildren()
    if (this.carregando) {
      const area = criarElemento('div')
      new Carregando({ mensagem: 'Carregando ordens…' }).montar(area)
      this.areaTabela.append(area)
      return
    }
    if (this.falhaLista !== null) {
      const area = criarElemento('div')
      new EstadoErro({
        mensagem: this.falhaLista,
        aoTentar: () => {
          void this.recarregar()
        },
      }).montar(area)
      this.areaTabela.append(area)
      return
    }
    const linhas = this.filtrar()
    if (linhas.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'equipamentos',
        titulo: 'Nenhuma ordem encontrada',
        mensagem: 'Registre uma ordem para acompanhar a manutenção da frota.',
      }).montar(area)
      this.areaTabela.append(area)
      return
    }
    this.areaTabela.append(
      criarElemento('div', {
        className: CLASSES.tabelaScroll,
        filhos: [
          new Tabela<OrdemManutencao>({
            colunas: COLUNAS,
            linhas,
            aoSelecionar: (linha) => this.selecionar(linha),
            linhaSelecionada: (linha) => linha.id === this.selecionado?.id,
          }).raiz,
        ],
      }),
    )
    const concluir = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Concluir',
    })
    concluir.disabled =
      this.selecionado === null || this.selecionado.status === 'Concluída'
    concluir.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.confirmarConclusao()
    })
    this.areaTabela.append(
      criarElemento('div', {
        className: CLASSES.acoes,
        filhos: [
          this.criarAcao('Editar', () => this.editarSelecionado()),
          concluir,
          this.criarAcaoPerigo('Inativar', () => this.confirmarInativacao()),
        ],
      }),
    )
  }

  private criarAcao(texto: string, acao: () => void): HTMLElement {
    const botao = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto,
    })
    botao.addEventListener('click', (evento) => {
      evento.stopPropagation()
      acao()
    })
    return botao
  }

  private criarAcaoPerigo(texto: string, acao: () => void): HTMLElement {
    const botao = criarElemento('button', {
      className: CLASSES.acaoPerigo,
      atributos: { type: 'button' },
      texto,
    })
    botao.disabled = this.selecionado === null
    botao.addEventListener('click', (evento) => {
      evento.stopPropagation()
      acao()
    })
    return botao
  }

  private opcoesEquipamentos(): readonly OpcaoSelect[] {
    return this.equipamentos.map((item) => ({
      valor: String(item.id),
      rotulo: `#${String(item.id)} · ${item.nome}`,
    }))
  }

  private opcoesFornecedores(): readonly OpcaoSelect[] {
    return this.fornecedores.map((item) => ({
      valor: String(item.id),
      rotulo: item.nome,
    }))
  }

  private montarPainel(): void {
    if (this.painelSlot === null) {
      return
    }
    const ordem = this.selecionado
    this.campos = {
      equipamento: new Select({
        id: 'manutencao-equipamento',
        rotulo: 'Equipamento',
        obrigatorio: true,
        placeholder: 'Selecione o equipamento',
        opcoes: this.opcoesEquipamentos(),
        valorInicial: ordem === null ? '' : String(ordem.equipamentoId),
      }),
      fornecedor: new Select({
        id: 'manutencao-fornecedor',
        rotulo: 'Fornecedor',
        placeholder: 'Nenhum',
        opcoes: this.opcoesFornecedores(),
        valorInicial: ordem?.fornecedorId === null || ordem === null ? '' : String(ordem.fornecedorId),
      }),
      descricao: new Campo({
        id: 'manutencao-descricao',
        rotulo: 'Descrição do serviço',
        obrigatorio: true,
        valorInicial: ordem?.descricao ?? '',
      }),
      dataEnvio: new Campo({
        id: 'manutencao-data-envio',
        rotulo: 'Data de envio',
        tipo: 'date',
        obrigatorio: true,
        valorInicial: ordem?.dataEnvio ?? '',
      }),
      dataRetornoPrevista: new Campo({
        id: 'manutencao-retorno-previsto',
        rotulo: 'Retorno previsto',
        tipo: 'date',
        valorInicial: ordem?.dataRetornoPrevista ?? '',
      }),
      custo: new Campo({
        id: 'manutencao-custo',
        rotulo: 'Custo (R$)',
        tipo: 'number',
        valorInicial: ordem?.custo === null || ordem === null ? '' : String(ordem.custo),
      }),
      status: new Select({
        id: 'manutencao-form-status',
        rotulo: 'Status',
        obrigatorio: true,
        opcoes: STATUS.map((item) => ({ valor: item, rotulo: item })),
        valorInicial: ordem?.status ?? 'Aberta',
      }),
    }
    const grade = criarElemento('div', {
      className: CLASSES.gradeCampos,
      filhos: [
        this.campos.equipamento.raiz,
        this.campos.fornecedor.raiz,
        this.campos.descricao.raiz,
        this.campos.dataEnvio.raiz,
        this.campos.dataRetornoPrevista.raiz,
        this.campos.custo.raiz,
        this.campos.status.raiz,
      ],
    })
    this.painel = new PainelFormulario({
      id: 'painel-manutencao',
      titulo: this.editandoId === null ? 'Nova ordem' : 'Editar ordem',
      corpo: grade,
      rodape: [
        new Botao({ texto: 'Cancelar', variante: 'ghost', aoClicar: () => this.cancelarEdicao() })
          .raiz,
        new Botao({
          texto: this.editandoId === null ? 'Abrir ordem' : 'Salvar',
          aoClicar: () => {
            void this.salvar()
          },
        }).raiz,
      ],
      carregando: this.carregando,
      desabilitado: this.carregando || this.salvando,
      selecionado: this.selecionado !== null,
    })
    this.painelSlot.replaceChildren(this.painel.raiz)
  }

  private filtrar(): readonly OrdemManutencao[] {
    const porTexto = filtrarPorTexto(this.registros, ['descricao'], this.busca)
    return filtrarPorStatus(porTexto, 'status', this.status)
  }

  private selecionar(ordem: OrdemManutencao): void {
    this.selecionado = ordem
    this.editandoId = ordem.id
    this.montarTabela()
    this.montarPainel()
  }

  private novo(): void {
    if (!ehAdministrador()) {
      return
    }
    this.selecionado = null
    this.editandoId = null
    this.montarTabela()
    this.montarPainel()
    this.campos?.descricao.focar()
  }

  private editarSelecionado(): void {
    if (!ehAdministrador() || this.selecionado === null) {
      return
    }
    this.editandoId = this.selecionado.id
    this.montarPainel()
    this.campos?.descricao.focar()
  }

  private cancelarEdicao(): void {
    this.selecionado = null
    this.editandoId = null
    this.montarTabela()
    this.montarPainel()
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
    const equipamento = Number(campos.equipamento.valor())
    marcar(
      campos.equipamento,
      Number.isInteger(equipamento) && equipamento > 0 ? null : 'Selecione o equipamento.',
    )
    marcar(
      campos.descricao,
      campos.descricao.valor().trim() === '' ? 'Descreva o serviço.' : null,
    )
    marcar(campos.dataEnvio, campos.dataEnvio.valor() === '' ? 'Informe a data de envio.' : null)
    const custo = campos.custo.valor().trim()
    marcar(
      campos.custo,
      custo === '' || Number.isFinite(Number(custo)) ? null : 'Informe um custo válido.',
    )
    return valido
  }

  private async salvar(): Promise<void> {
    if (!ehAdministrador() || this.salvando || !this.validar() || this.campos === null) {
      return
    }
    const campos = this.campos
    const fornecedorId = Number(campos.fornecedor.valor())
    const custoTexto = campos.custo.valor().trim()
    const comum = {
      equipamentoId: Number(campos.equipamento.valor()),
      fornecedorId: Number.isInteger(fornecedorId) && fornecedorId > 0 ? fornecedorId : null,
      descricao: campos.descricao.valor().trim(),
      dataEnvio: campos.dataEnvio.valor(),
      dataRetornoPrevista: campos.dataRetornoPrevista.valor() || null,
      custo: custoTexto === '' ? null : Number(custoTexto),
    }
    const status = campos.status.valor()
    this.salvando = true
    try {
      if (this.editandoId === null) {
        await this.servico.criar({
          ...comum,
          status: ehStatus(status) ? status : 'Aberta',
        })
        this.toasts.exibir({
          titulo: 'Ordem aberta',
          mensagem: 'A ordem de manutenção foi registrada.',
          tom: 'sucesso',
        })
      } else {
        await this.servico.atualizar({
          id: this.editandoId,
          ...comum,
          status: ehStatus(status) ? status : undefined,
        })
        this.toasts.exibir({
          titulo: 'Ordem atualizada',
          mensagem: 'Alterações salvas.',
          tom: 'sucesso',
        })
      }
      this.cancelarEdicao()
      await this.recarregar()
    } catch (erro) {
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: mensagemErroOperacao(erro, 'a ordem de manutenção'),
        tom: 'erro',
      })
    } finally {
      this.salvando = false
    }
  }

  private confirmarConclusao(): void {
    const ordem = this.selecionado
    if (!ehAdministrador() || ordem === null || ordem.status === 'Concluída') {
      return
    }
    this.confirmar({
      titulo: 'Concluir manutenção',
      mensagem: `Concluir a ordem #${String(ordem.id)}? A data de retorno será hoje e o equipamento voltará para a frota.`,
      rotulo: 'Concluir',
      acao: () => {
        void (async () => {
          try {
            await this.servico.concluir({ id: ordem.id, custo: ordem.custo })
            this.toasts.exibir({
              titulo: 'Manutenção concluída',
              mensagem: 'O equipamento voltou a disponível.',
              tom: 'sucesso',
            })
            this.cancelarEdicao()
            await this.recarregar()
          } catch (erro) {
            this.toasts.exibir({
              titulo: 'Não foi possível concluir',
              mensagem: mensagemErroOperacao(erro, 'a ordem de manutenção'),
              tom: 'erro',
            })
          }
        })()
      },
    })
  }

  private confirmarInativacao(): void {
    const ordem = this.selecionado
    if (!ehAdministrador() || ordem === null) {
      return
    }
    this.confirmar({
      titulo: 'Inativar ordem de manutenção',
      mensagem: `Inativar a ordem #${String(ordem.id)}? Ela deixará de aparecer nas consultas. Nenhum equipamento será removido.`,
      rotulo: 'Inativar',
      acao: () => {
        void (async () => {
          try {
            await this.servico.inativar(ordem.id)
            this.toasts.exibir({
              titulo: 'Ordem inativada',
              mensagem: 'O registro não aparecerá mais nas consultas.',
              tom: 'sucesso',
            })
            this.cancelarEdicao()
            await this.recarregar()
          } catch (erro) {
            this.toasts.exibir({
              titulo: 'Não foi possível inativar',
              mensagem: mensagemErroOperacao(erro, 'a ordem de manutenção'),
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
      variante: 'ghost',
      aoClicar: () => {
        this.modal?.fechar()
        this.modal = null
      },
    })
    const confirmar = new Botao({
      texto: opcoes.rotulo,
      variante: 'destrutivo',
      aoClicar: () => {
        this.modal?.fechar()
        this.modal = null
        opcoes.acao()
      },
    })
    this.modal = new Modal({
      id: 'confirmar-manutencao',
      titulo: opcoes.titulo,
      conteudo: criarElemento('p', { className: CLASSES.avisoErro, texto: opcoes.mensagem }),
      rodape: [cancelar.raiz, confirmar.raiz],
      erro: true,
      aoFechar: () => {
        this.modal = null
      },
    })
    this.modal.montarFilho(document.body)
  }
}
