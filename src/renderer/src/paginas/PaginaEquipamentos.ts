import type {
  Categoria,
  CategoriaEquipamento,
  DisponibilidadeEquipamento,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  EstadoConservacao,
  Fornecedor,
  FornecedorListarFiltros,
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
  criarIcone,
  ehAdministrador,
  observarPerfil,
  registrarAtalhos,
  substituirConteudo,
} from '../nucleo'
import { EquipamentoServico, ServicoFornecedores } from '../servicos'
import { formatadorPtBr } from '../util'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-3',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoSemPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeContainer: 'max-w-2xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  avisoExemplo:
    'inline-flex items-center gap-2 rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
  textoLeitura: 'text-sm text-grafite',
  contador: 'text-xs text-floresta/70',
  oculto: 'hidden',
  acessoNegado:
    'flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-erro/40 bg-erro-suave p-8 text-center',
  acessoNegadoIcone: 'size-9 text-erro',
  acessoNegadoTitulo: 'font-display text-lg text-erro',
  acessoNegadoMensagem: 'max-w-md text-sm text-grafite',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'
const ICONE_ERRO = 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v6M12 16h.01'

/** Domínios fechados do contrato compartilhado — replicados no main via Zod. */
const CATEGORIAS: readonly CategoriaEquipamento[] = ['Bicicleta', 'Caiaque', 'Prancha', 'Camping']
const ESTADOS_CONSERVACAO: readonly EstadoConservacao[] = [
  'Novo',
  'Bom',
  'Desgastado',
  'Em Manutenção',
]
const DISPONIBILIDADES: readonly DisponibilidadeEquipamento[] = [
  'Disponível',
  'Indisponível',
  'Em manutenção',
]

interface FormularioEquipamento {
  nome: string
  categoria: string
  estadoConservacao: string
  disponibilidade: string
  fornecedorId: string
  valorDiaria: string
}

interface CamposFormulario {
  readonly nome: Campo
  readonly categoria: Select
  readonly estadoConservacao: Select
  readonly disponibilidade: Select
  readonly fornecedor: Select
  readonly valorDiaria: Campo
}

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

interface LinhaEquipamento {
  readonly id: number
  readonly nome: string
  readonly categoria: CategoriaEquipamento
  readonly estadoConservacao: EstadoConservacao
  readonly disponibilidade: DisponibilidadeEquipamento
  readonly fornecedor: string
  readonly valorDiaria: number
  readonly ativo: boolean
}

function ehCategoria(valor: string): valor is CategoriaEquipamento {
  return CATEGORIAS.some((categoria) => categoria === valor)
}

function ehEstadoConservacao(valor: string): valor is EstadoConservacao {
  return ESTADOS_CONSERVACAO.some((estado) => estado === valor)
}

function ehDisponibilidade(valor: string): valor is DisponibilidadeEquipamento {
  return DISPONIBILIDADES.some((disponibilidade) => disponibilidade === valor)
}

function opcoesCategorias(categorias: readonly Categoria[]): readonly OpcaoSelect[] {
  const validas = CATEGORIAS.filter((valor) =>
    categorias.some((categoria) => categoria.nome === valor),
  )
  return (validas.length > 0 ? validas : CATEGORIAS).map((valor) => ({
    valor,
    rotulo: valor,
  }))
}

function opcoesEstadoConservacao(): readonly OpcaoSelect[] {
  return ESTADOS_CONSERVACAO.map((valor) => ({ valor, rotulo: valor }))
}

function opcoesDisponibilidade(): readonly OpcaoSelect[] {
  return DISPONIBILIDADES.map((valor) => ({ valor, rotulo: valor }))
}

function opcoesFornecedores(fornecedores: readonly Fornecedor[]): readonly OpcaoSelect[] {
  const ordenados = [...fornecedores].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  )
  return [
    { valor: '', rotulo: 'Nenhum' },
    ...ordenados.map((fornecedor) => ({ valor: String(fornecedor.id), rotulo: fornecedor.nome })),
  ]
}

function idFornecedor(valor: string): number | null {
  if (valor === '') {
    return null
  }
  const id = Number(valor)
  return Number.isInteger(id) && id > 0 ? id : null
}

function valorDiariaDoFormulario(valor: string): number {
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= 0 ? numero : 0
}

function formularioVazio(): FormularioEquipamento {
  return {
    nome: '',
    categoria: '',
    estadoConservacao: '',
    disponibilidade: '',
    fornecedorId: '',
    valorDiaria: '0',
  }
}

function formularioDe(
  equipamento: Equipamento,
  fornecedores: readonly Fornecedor[],
): FormularioEquipamento {
  const id = equipamento.fornecedorId
  const fornecedorDisponivel =
    id === null || fornecedores.some((fornecedor) => fornecedor.id === id)
  return {
    nome: equipamento.nome,
    categoria: equipamento.categoria,
    estadoConservacao: equipamento.estadoConservacao,
    disponibilidade: equipamento.disponibilidade,
    fornecedorId: id === null || !fornecedorDisponivel ? '' : String(id),
    valorDiaria: (equipamento.valorDiaria ?? 0).toFixed(2),
  }
}

function codigoDoErro(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null || !('codigo' in erro)) {
    return null
  }
  const codigo: unknown = erro.codigo
  return typeof codigo === 'string' ? codigo : null
}

function mensagemFalha(erro: unknown, padrao: string): string {
  const codigo = codigoDoErro(erro)
  if (codigo === 'REGISTRO_DUPLICADO') {
    return 'Já existe um equipamento com este nome.'
  }
  if (codigo === 'RELACAO_INVALIDA') {
    return 'Fornecedor não encontrado. Selecione outro ou Nenhum.'
  }
  return padrao
}

function tomConservacao(estado: EstadoConservacao): TomBadge {
  return estado === 'Novo' || estado === 'Bom' ? 'sucesso' : 'alerta'
}

function tomDisponibilidade(disponibilidade: DisponibilidadeEquipamento): TomBadge {
  if (disponibilidade === 'Disponível') {
    return 'sucesso'
  }
  return disponibilidade === 'Indisponível' ? 'erro' : 'alerta'
}

const COLUNAS: readonly ColunaTabela<LinhaEquipamento>[] = [
  { chave: 'nome', rotulo: 'Nome', ordenavel: true },
  { chave: 'categoria', rotulo: 'Categoria', ordenavel: true },
  {
    chave: 'estadoConservacao',
    rotulo: 'Conservação',
    ordenavel: true,
    celula: (linha) =>
      new Badge({
        texto: linha.estadoConservacao,
        tom: tomConservacao(linha.estadoConservacao),
      }).raiz,
  },
  {
    chave: 'disponibilidade',
    rotulo: 'Disponibilidade',
    ordenavel: true,
    celula: (linha) =>
      new Badge({
        texto: linha.disponibilidade,
        tom: tomDisponibilidade(linha.disponibilidade),
      }).raiz,
  },
  { chave: 'fornecedor', rotulo: 'Fornecedor', ordenavel: true },
  {
    chave: 'valorDiaria',
    rotulo: 'Diária',
    ordenavel: true,
    celula: (linha) => formatadorPtBr.moeda(linha.valorDiaria),
  },
  {
    chave: 'ativo',
    rotulo: 'Situação',
    celula: (linha) =>
      new Badge({
        texto: linha.ativo ? 'Ativo' : 'Inativo',
        tom: linha.ativo ? 'sucesso' : 'neutro',
      }).raiz,
  },
]

export class PaginaEquipamentos extends Componente {
  private readonly servico = new EquipamentoServico()
  private readonly servicoFornecedores = new ServicoFornecedores()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private equipamentos: readonly Equipamento[] = []
  private categorias: readonly Categoria[] = []
  private fornecedores: readonly Fornecedor[] = []
  private selecionado: Equipamento | null = null
  private editandoId: number | null = null
  private formulario: FormularioEquipamento = formularioVazio()
  private campos: CamposFormulario | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null
  private areaConteudo: HTMLElement | null = null
  private campoBusca: Campo | null = null
  private selectCategoriaFiltro: Select | null = null
  private selectConservacaoFiltro: Select | null = null
  private selectDisponibilidadeFiltro: Select | null = null
  private modal: Modal | null = null
  private busca = ''
  private filtroCategoria = ''
  private filtroConservacao = ''
  private filtroDisponibilidade = ''
  private carregando = true
  private salvando = false
  private falhaLista: string | null = null
  private falhaFornecedores = false
  private dadosDeExemplo = false
  private painelOculto = false
  private geracao = 0

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
      aoConfirmarRapido: () => {
        void this.salvar()
      },
      aoCancelar: () => this.cancelarEdicao(),
      emCampo: () => false,
      modalAberto: () => this.modal !== null,
    })

    this.cancelarPerfil = observarPerfil((perfil) => {
      this.geracao += 1
      this.salvando = false
      this.modal?.fechar()
      this.modal = null
      if (perfil !== 'administrador') {
        this.carregando = false
        this.mostrarAcessoRestrito()
        return
      }
      void this.recarregar()
    })
  }

  protected aoMontar(): void {
    this.toasts.montarFilho(document.body)
    if (!ehAdministrador()) {
      this.mostrarAcessoRestrito()
      return
    }
    this.montarEstrutura()
    void this.recarregar()
  }

  protected aoDesmontar(): void {
    this.cancelarAtalhos()
    this.cancelarPerfil()
    this.geracao += 1
    this.modal?.fechar()
    this.modal = null
    this.toasts.destruir()
  }

  private podeEscrever(): boolean {
    return ehAdministrador() && !this.dadosDeExemplo && !this.carregando && !this.salvando
  }

  private async recarregar(): Promise<void> {
    if (!ehAdministrador()) {
      return
    }

    const geracao = ++this.geracao
    this.carregando = true
    this.falhaLista = null
    this.falhaFornecedores = false
    this.montarEstrutura()

    const filtros: EquipamentoListarFiltros = { incluirInativos: true }
    const filtrosFornecedores: FornecedorListarFiltros = { incluirInativos: true }

    try {
      const [resultadoEquipamentos, resultadoCategorias] = await Promise.all([
        this.servico.listar(filtros),
        this.servico.listarCategorias(),
      ])
      if (geracao !== this.geracao || !ehAdministrador()) {
        return
      }
      this.equipamentos = resultadoEquipamentos.itens
      this.categorias = resultadoCategorias.itens
      this.dadosDeExemplo =
        resultadoEquipamentos.dadosDeExemplo || resultadoCategorias.dadosDeExemplo
    } catch {
      if (geracao !== this.geracao || !ehAdministrador()) {
        return
      }
      this.falhaLista = 'Não foi possível carregar os equipamentos. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: 'Não foi possível carregar os equipamentos. Tente novamente.',
        tom: 'erro',
      })
    }

    try {
      const fornecedores = await this.servicoFornecedores.listar(filtrosFornecedores)
      if (geracao !== this.geracao || !ehAdministrador()) {
        return
      }
      this.fornecedores = fornecedores
    } catch {
      if (geracao !== this.geracao || !ehAdministrador()) {
        return
      }
      this.fornecedores = []
      this.falhaFornecedores = true
      this.toasts.exibir({
        titulo: 'Fornecedores indisponíveis',
        mensagem: 'O campo fornecedor ficou apenas com a opção Nenhum.',
        tom: 'alerta',
      })
    }

    if (geracao !== this.geracao || !ehAdministrador()) {
      return
    }
    this.carregando = false
    if (this.selecionado !== null) {
      const atual = this.equipamentos.find((item) => item.id === this.selecionado?.id)
      this.selecionado = atual ?? null
      if (atual !== undefined) {
        this.formulario = formularioDe(atual, this.fornecedores)
      } else {
        this.editandoId = null
      }
    }
    this.painelOculto = this.equipamentos.length === 0 && this.editandoId === null
    this.montarEstrutura()
  }

  private mostrarAcessoRestrito(): void {
    const area = criarElemento('div', {
      className: CLASSES.acessoNegado,
      atributos: { role: 'alert' },
      filhos: [
        criarIcone(ICONE_ERRO, CLASSES.acessoNegadoIcone),
        criarElemento('h3', {
          className: CLASSES.acessoNegadoTitulo,
          texto: 'Acesso restrito',
        }),
        criarElemento('p', {
          className: CLASSES.acessoNegadoMensagem,
          texto: 'Acesso restrito a administradores.',
        }),
      ],
    })
    substituirConteudo(this.elemento, area)
  }

  private montarEstrutura(): void {
    if (!ehAdministrador()) {
      this.mostrarAcessoRestrito()
      return
    }

    const avisoExemplo = criarElemento('span', {
      className: this.dadosDeExemplo ? CLASSES.avisoExemplo : CLASSES.oculto,
      texto: 'dados de exemplo',
    })
    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Equipamentos' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Cadastro, conservação e fornecedores da frota.',
            }),
          ],
        }),
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [
            avisoExemplo,
            new Botao({
              texto: 'Novo equipamento',
              desabilitado: !this.podeEscrever(),
              aoClicar: () => this.novo(),
            }).raiz,
          ],
        }),
      ],
    })

    this.campoBusca = new Campo({
      id: 'equipamentos-busca',
      rotulo: 'Buscar equipamento',
      placeholder: 'Nome do equipamento',
      icone: ICONE_BUSCA,
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarTabela()
      },
    })
    this.selectCategoriaFiltro = new Select({
      id: 'equipamentos-filtro-categoria',
      rotulo: 'Categoria',
      placeholder: 'Todas',
      valorInicial: this.filtroCategoria,
      opcoes: opcoesCategorias(this.categorias),
      aoAlterar: (valor) => {
        this.filtroCategoria = valor
        this.atualizarTabela()
      },
    })
    this.selectConservacaoFiltro = new Select({
      id: 'equipamentos-filtro-conservacao',
      rotulo: 'Conservação',
      placeholder: 'Todas',
      valorInicial: this.filtroConservacao,
      opcoes: opcoesEstadoConservacao(),
      aoAlterar: (valor) => {
        this.filtroConservacao = valor
        this.atualizarTabela()
      },
    })
    this.selectDisponibilidadeFiltro = new Select({
      id: 'equipamentos-filtro-disponibilidade',
      rotulo: 'Disponibilidade',
      placeholder: 'Todas',
      valorInicial: this.filtroDisponibilidade,
      opcoes: opcoesDisponibilidade(),
      aoAlterar: (valor) => {
        this.filtroDisponibilidade = valor
        this.atualizarTabela()
      },
    })

    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [
        this.campoBusca.raiz,
        this.selectCategoriaFiltro.raiz,
        this.selectConservacaoFiltro.raiz,
        this.selectDisponibilidadeFiltro.raiz,
      ],
    })

    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.areaConteudo = criarElemento('div', {
      className: this.painelOculto ? CLASSES.conteudoSemPainel : CLASSES.conteudoComPainel,
      filhos: [this.painelSlot, this.areaTabela],
    })

    substituirConteudo(this.elemento, cabecalho, filtros, this.areaConteudo)
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private atualizarPainel(): void {
    if (this.painelSlot === null || this.areaConteudo === null || !ehAdministrador()) {
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

    const corpo = this.construirFormulario()
    const acoesCabecalho: Node[] = []
    if (this.selecionado !== null) {
      acoesCabecalho.push(
        new Botao({
          texto: 'Inativar',
          variante: 'ghost',
          desabilitado: !this.podeEscrever() || !this.selecionado.ativo,
          aoClicar: () => this.confirmarInativacao(),
        }).raiz,
      )
    }

    this.painel = new PainelFormulario({
      id: 'equipamentos-formulario',
      titulo: this.editandoId === null ? 'Novo equipamento' : 'Editar equipamento',
      corpo: criarElemento('div', { className: CLASSES.gradeContainer, filhos: [corpo] }),
      rodape: [
        new Botao({
          texto: 'Cancelar',
          variante: 'secundario',
          aoClicar: () => this.cancelarEdicao(),
        }).raiz,
        new Botao({
          texto: 'Salvar',
          desabilitado: !this.podeEscrever(),
          aoClicar: () => {
            void this.salvar()
          },
        }).raiz,
      ],
      acoesCabecalho,
      carregando: this.carregando,
      desabilitado: this.carregando || this.salvando || this.dadosDeExemplo,
      selecionado: this.selecionado !== null,
      mensagemCarregando: 'Carregando formulário…',
    })
    this.painelSlot.replaceChildren(this.painel.raiz)

    const grade = this.campos?.nome.raiz.parentElement
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

  private construirFormulario(): HTMLElement {
    const estado = this.formulario
    const desabilitado = !this.podeEscrever()
    const campos: CamposFormulario = {
      nome: new Campo({
        id: 'equipamento-nome',
        rotulo: 'Nome',
        obrigatorio: true,
        valorInicial: estado.nome,
        placeholder: 'Bicicleta MTB Aro 29',
        desabilitado,
        aoAlterar: (valor) => {
          estado.nome = valor
          campos.nome.definirErro(null)
        },
      }),
      categoria: new Select({
        id: 'equipamento-categoria',
        rotulo: 'Categoria',
        obrigatorio: true,
        placeholder: 'Selecione',
        valorInicial: estado.categoria,
        opcoes: opcoesCategorias(this.categorias),
        desabilitado,
        aoAlterar: (valor) => {
          estado.categoria = valor
          campos.categoria.definirErro(null)
        },
      }),
      estadoConservacao: new Select({
        id: 'equipamento-conservacao',
        rotulo: 'Estado de conservação',
        obrigatorio: true,
        placeholder: 'Selecione',
        valorInicial: estado.estadoConservacao,
        opcoes: opcoesEstadoConservacao(),
        desabilitado,
        aoAlterar: (valor) => {
          estado.estadoConservacao = valor
          campos.estadoConservacao.definirErro(null)
        },
      }),
      disponibilidade: new Select({
        id: 'equipamento-disponibilidade',
        rotulo: 'Disponibilidade',
        obrigatorio: true,
        placeholder: 'Selecione',
        valorInicial: estado.disponibilidade,
        opcoes: opcoesDisponibilidade(),
        desabilitado,
        aoAlterar: (valor) => {
          estado.disponibilidade = valor
          campos.disponibilidade.definirErro(null)
        },
      }),
      fornecedor: new Select({
        id: 'equipamento-fornecedor',
        rotulo: 'Fornecedor',
        valorInicial: estado.fornecedorId,
        opcoes: opcoesFornecedores(this.fornecedores),
        ajuda: this.falhaFornecedores
          ? 'Não foi possível carregar os fornecedores. Apenas Nenhum está disponível.'
          : undefined,
        desabilitado,
        aoAlterar: (valor) => {
          estado.fornecedorId = valor
          campos.fornecedor.definirErro(null)
        },
      }),
      valorDiaria: new Campo({
        id: 'equipamento-valor-diaria',
        rotulo: 'Diária (R$)',
        tipo: 'number',
        valorInicial: estado.valorDiaria,
        placeholder: '0.00',
        ajuda: 'Valor de tabela sugerido ao montar uma reserva.',
        desabilitado,
        aoAlterar: (valor) => {
          estado.valorDiaria = valor
          campos.valorDiaria.definirErro(null)
        },
      }),
    }

    this.campos = campos
    return criarElemento('div', {
      className: CLASSES.gradeCampos,
      filhos: [
        campos.nome.raiz,
        campos.categoria.raiz,
        campos.estadoConservacao.raiz,
        campos.disponibilidade.raiz,
        campos.fornecedor.raiz,
        campos.valorDiaria.raiz,
      ],
    })
  }

  private atualizarTabela(): void {
    if (this.areaTabela === null || !ehAdministrador()) {
      return
    }

    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({
        mensagem: 'Carregando equipamentos…',
        variante: 'skeleton',
        linhas: 3,
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    if (this.falhaLista !== null && this.equipamentos.length === 0) {
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
      const semFiltros =
        this.busca.trim() === '' &&
        this.filtroCategoria === '' &&
        this.filtroConservacao === '' &&
        this.filtroDisponibilidade === ''
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'equipamentos',
        titulo: semFiltros
          ? 'Nenhum equipamento cadastrado'
          : 'Nenhum equipamento com esses filtros',
        mensagem: semFiltros
          ? 'Cadastre o primeiro equipamento da frota.'
          : 'Tente outros critérios ou limpe os filtros.',
        acao: semFiltros
          ? {
              texto: 'Novo equipamento',
              desabilitado: !this.podeEscrever(),
              aoClicar: () => this.novo(),
            }
          : { texto: 'Limpar filtros', aoClicar: () => this.limparFiltros() },
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    const linhas: LinhaEquipamento[] = filtrados.map((equipamento) => ({
      id: equipamento.id,
      nome: equipamento.nome,
      categoria: equipamento.categoria,
      estadoConservacao: equipamento.estadoConservacao,
      disponibilidade: equipamento.disponibilidade,
      fornecedor: this.nomeFornecedor(equipamento.fornecedorId),
      valorDiaria: equipamento.valorDiaria ?? 0,
      ativo: equipamento.ativo,
    }))
    const tabela = new Tabela<LinhaEquipamento>({
      colunas: [
        ...COLUNAS,
        {
          chave: 'id',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoes(linha),
        },
      ],
      linhas,
      mensagemVazia: 'Nenhum equipamento cadastrado.',
      aoSelecionar: (linha) => {
        const equipamento = this.equipamentos.find((item) => item.id === linha.id)
        if (equipamento !== undefined) {
          this.selecionar(equipamento)
        }
      },
      linhaSelecionada: (linha) => this.selecionado?.id === linha.id,
    })

    const cabecalho = tabela.raiz.querySelector('thead')
    if (cabecalho !== null) {
      cabecalho.className = CLASSES.cabecalhoFixo
    }

    this.areaTabela.replaceChildren(
      criarElemento('div', {
        className: CLASSES.tabelaScroll,
        filhos: [
          criarElemento('p', {
            className: CLASSES.contador,
            texto: `${filtrados.length} equipamento${filtrados.length === 1 ? '' : 's'}`,
          }),
          tabela.raiz,
        ],
      }),
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

  private criarAcoes(linha: LinhaEquipamento): HTMLElement {
    const equipamento = this.equipamentos.find((item) => item.id === linha.id)
    if (equipamento === undefined) {
      return criarElemento('div', { className: CLASSES.acoes })
    }

    const editar = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Editar',
    })
    editar.disabled = !this.podeEscrever()
    editar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(equipamento)
      this.editarSelecionado()
    })

    const inativar = criarElemento('button', {
      className: CLASSES.acaoPerigo,
      atributos: { type: 'button' },
      texto: 'Inativar',
    })
    inativar.disabled = !this.podeEscrever() || !equipamento.ativo
    inativar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(equipamento)
      this.confirmarInativacao()
    })

    return criarElemento('div', { className: CLASSES.acoes, filhos: [editar, inativar] })
  }

  private nomeFornecedor(id: number | null): string {
    if (id === null) {
      return '—'
    }
    return this.fornecedores.find((fornecedor) => fornecedor.id === id)?.nome ?? '—'
  }

  private filtrar(): readonly Equipamento[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    return this.equipamentos.filter((equipamento) => {
      const combinaBusca =
        termo === '' || equipamento.nome.toLocaleLowerCase('pt-BR').includes(termo)
      const combinaCategoria =
        this.filtroCategoria === '' || equipamento.categoria === this.filtroCategoria
      const combinaConservacao =
        this.filtroConservacao === '' || equipamento.estadoConservacao === this.filtroConservacao
      const combinaDisponibilidade =
        this.filtroDisponibilidade === '' ||
        equipamento.disponibilidade === this.filtroDisponibilidade
      return combinaBusca && combinaCategoria && combinaConservacao && combinaDisponibilidade
    })
  }

  private limparFiltros(): void {
    this.busca = ''
    this.filtroCategoria = ''
    this.filtroConservacao = ''
    this.filtroDisponibilidade = ''
    this.campoBusca?.definirValor('')
    this.selectCategoriaFiltro?.definirValor('')
    this.selectConservacaoFiltro?.definirValor('')
    this.selectDisponibilidadeFiltro?.definirValor('')
    this.atualizarTabela()
  }

  private selecionar(equipamento: Equipamento): void {
    this.selecionado = equipamento
    this.formulario = formularioDe(equipamento, this.fornecedores)
    this.editandoId = equipamento.id
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private novo(): void {
    if (!this.podeEscrever()) {
      return
    }
    this.selecionado = null
    this.editandoId = null
    this.formulario = formularioVazio()
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
    this.painel?.focarPrimeiroControle()
  }

  private editarSelecionado(): void {
    if (!this.podeEscrever()) {
      return
    }
    if (this.selecionado === null) {
      this.toasts.exibir({
        mensagem: 'Selecione um equipamento na tabela antes de editar.',
        tom: 'alerta',
      })
      return
    }
    this.selecionar(this.selecionado)
    this.painel?.focarPrimeiroControle()
  }

  private confirmarSelecionado(): void {
    if (!ehAdministrador()) {
      return
    }
    if (this.selecionado !== null) {
      this.selecionar(this.selecionado)
      return
    }
    this.novo()
  }

  private cancelarEdicao(): void {
    if (!ehAdministrador()) {
      return
    }
    if (this.selecionado !== null || this.editandoId !== null) {
      if (this.podeEscrever()) {
        this.novo()
        return
      }
      this.selecionado = null
      this.editandoId = null
      this.painelOculto = true
      this.atualizarPainel()
      this.atualizarTabela()
      return
    }
    this.limparFiltros()
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

    const nome = this.formulario.nome.trim()
    marcar(
      campos.nome,
      nome.length === 0
        ? 'Informe o nome do equipamento.'
        : nome.length > 150
          ? 'Use no máximo 150 caracteres.'
          : null,
    )
    marcar(
      campos.categoria,
      ehCategoria(this.formulario.categoria) ? null : 'Selecione uma categoria.',
    )
    marcar(
      campos.estadoConservacao,
      ehEstadoConservacao(this.formulario.estadoConservacao)
        ? null
        : 'Selecione o estado de conservação.',
    )
    marcar(
      campos.disponibilidade,
      ehDisponibilidade(this.formulario.disponibilidade)
        ? null
        : 'Selecione a disponibilidade.',
    )

    const fornecedorId = idFornecedor(this.formulario.fornecedorId)
    const fornecedorValido =
      this.formulario.fornecedorId === '' ||
      (fornecedorId !== null &&
        this.fornecedores.some((fornecedor) => fornecedor.id === fornecedorId))
    marcar(campos.fornecedor, fornecedorValido ? null : 'Selecione um fornecedor válido.')

    const diaria = Number(this.formulario.valorDiaria)
    marcar(
      campos.valorDiaria,
      this.formulario.valorDiaria.trim() === '' || (Number.isFinite(diaria) && diaria >= 0)
        ? null
        : 'Informe uma diária maior ou igual a zero.',
    )

    return valido
  }

  private async salvar(): Promise<void> {
    if (!this.podeEscrever() || this.modal !== null) {
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

    const categoria = this.formulario.categoria
    const estadoConservacao = this.formulario.estadoConservacao
    const disponibilidade = this.formulario.disponibilidade
    if (
      !ehCategoria(categoria) ||
      !ehEstadoConservacao(estadoConservacao) ||
      !ehDisponibilidade(disponibilidade)
    ) {
      return
    }

    const dadosComuns = {
      nome: this.formulario.nome.trim(),
      categoria,
      estadoConservacao,
      disponibilidade,
      fornecedorId: idFornecedor(this.formulario.fornecedorId),
      valorDiaria: valorDiariaDoFormulario(this.formulario.valorDiaria),
    }

    this.salvando = true
    this.painel?.definirDesabilitado(true)
    try {
      let salvo: Equipamento
      if (this.editandoId === null) {
        const criar: EquipamentoCriarEntrada = dadosComuns
        salvo = await this.servico.criar(criar)
      } else {
        const atualizar: EquipamentoAtualizarEntrada = { id: this.editandoId, ...dadosComuns }
        salvo = await this.servico.atualizar(atualizar)
      }

      this.toasts.exibir({
        titulo: 'Equipamento salvo',
        mensagem: 'Cadastro atualizado com sucesso.',
        tom: 'sucesso',
      })
      this.limparFiltros()
      this.novo()
      await this.recarregar()
      if (!ehAdministrador()) {
        return
      }
      const registro = this.equipamentos.find((item) => item.id === salvo.id) ?? salvo
      this.selecionar(registro)
    } catch (erro) {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: mensagemFalha(erro, 'Verifique os dados e tente novamente.'),
        tom: 'erro',
      })
    } finally {
      this.salvando = false
      this.painel?.definirDesabilitado(false)
    }
  }

  private confirmarInativacao(): void {
    const equipamento = this.selecionado
    if (!this.podeEscrever() || equipamento === null || !equipamento.ativo || this.modal !== null) {
      return
    }
    this.confirmar({
      titulo: 'Inativar equipamento',
      mensagem: `Inativar ${equipamento.nome}? O equipamento deixará de aparecer nas reservas.`,
      rotulo: 'Inativar',
      acao: () => {
        void this.inativar(equipamento.id)
      },
    })
  }

  private async inativar(id: number): Promise<void> {
    if (!this.podeEscrever()) {
      return
    }
    try {
      await this.servico.inativar(id)
      this.toasts.exibir({
        titulo: 'Equipamento inativado',
        mensagem: 'O registro não aparecerá mais nas reservas.',
        tom: 'sucesso',
      })
      this.novo()
      await this.recarregar()
      if (!ehAdministrador()) {
        return
      }
      const registro = this.equipamentos.find((item) => item.id === id)
      if (registro !== undefined) {
        this.selecionar(registro)
      }
    } catch (erro) {
      this.toasts.exibir({
        titulo: 'Não foi possível inativar',
        mensagem: mensagemFalha(erro, 'Tente novamente em instantes.'),
        tom: 'erro',
      })
    }
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
      id: 'equipamentos-confirmacao',
      titulo: opcoes.titulo,
      conteudo: criarElemento('p', { className: CLASSES.textoLeitura, texto: opcoes.mensagem }),
      rodape: [cancelar.raiz, confirmar.raiz],
      aoFechar: () => {
        this.modal = null
      },
    })
    this.modal = modal
    modal.abrir()
  }
}
