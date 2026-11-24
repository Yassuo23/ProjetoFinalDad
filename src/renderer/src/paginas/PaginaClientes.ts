import type { Cliente } from '../../../shared/contratos/modelos'
import {
  AreaToast,
  Botao,
  Campo,
  Carregando,
  EstadoErro,
  EstadoVazio,
  Modal,
  Select,
  Tabela,
} from '../componentes'
import type { ColunaTabela, OpcaoSelect } from '../componentes'
import { Componente, criarElemento, substituirConteudo } from '../nucleo'
import { ServicoClientes } from '../servicos'

/** Classes literais copiadas do Design System (§8) — nenhuma interpolação. */
const CLASSES = {
  pagina: 'flex flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  avisoExemplo:
    'inline-flex items-center gap-2 rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta',
  oculto: 'hidden',
  grade: 'grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]',
  card: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  tituloSecao: 'font-display text-lg text-floresta',
  instrucao: 'mt-1 text-xs text-floresta/70',
  formulario: 'mt-4 flex flex-col gap-4',
  linhaDois: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  cepLinha: 'flex items-end gap-2',
  cepCampo: 'min-w-0 flex-1',
  acoes: 'flex flex-wrap justify-end gap-3',
  lista: 'flex min-w-0 flex-col gap-3',
  cabecalhoLista: 'flex flex-wrap items-center justify-between gap-3',
  campoBusca: 'w-full',
  contador: 'text-xs text-floresta/70',
  detalhes: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  detalheRotulo: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  detalheValor: 'mt-0.5 text-sm text-grafite',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'

const UFS: readonly OpcaoSelect[] = [
  { valor: 'AC', rotulo: 'AC' },
  { valor: 'AL', rotulo: 'AL' },
  { valor: 'AP', rotulo: 'AP' },
  { valor: 'AM', rotulo: 'AM' },
  { valor: 'BA', rotulo: 'BA' },
  { valor: 'CE', rotulo: 'CE' },
  { valor: 'DF', rotulo: 'DF' },
  { valor: 'ES', rotulo: 'ES' },
  { valor: 'GO', rotulo: 'GO' },
  { valor: 'MA', rotulo: 'MA' },
  { valor: 'MT', rotulo: 'MT' },
  { valor: 'MS', rotulo: 'MS' },
  { valor: 'MG', rotulo: 'MG' },
  { valor: 'PA', rotulo: 'PA' },
  { valor: 'PB', rotulo: 'PB' },
  { valor: 'PR', rotulo: 'PR' },
  { valor: 'PE', rotulo: 'PE' },
  { valor: 'PI', rotulo: 'PI' },
  { valor: 'RJ', rotulo: 'RJ' },
  { valor: 'RN', rotulo: 'RN' },
  { valor: 'RS', rotulo: 'RS' },
  { valor: 'RO', rotulo: 'RO' },
  { valor: 'RR', rotulo: 'RR' },
  { valor: 'SC', rotulo: 'SC' },
  { valor: 'SP', rotulo: 'SP' },
  { valor: 'SE', rotulo: 'SE' },
  { valor: 'TO', rotulo: 'TO' },
]

interface LinhaCliente {
  readonly id: number
  readonly nome: string
  readonly telefone: string
  readonly cidade: string
}

interface CamposFormulario {
  readonly nome: Campo
  readonly cep: Campo
  readonly logradouro: Campo
  readonly numero: Campo
  readonly complemento: Campo
  readonly bairro: Campo
  readonly cidade: Campo
  readonly uf: Select
  readonly email: Campo
  readonly telefone: Campo
}

function valorOuTraco(valor: string | null | undefined): string {
  return valor === null || valor === undefined || valor === '' ? '—' : valor
}

function normalizar(valor: string): string {
  return valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
}

function mascararCep(valor: string): string {
  const digitos = valor.replace(/\D/g, '').slice(0, 8)
  return digitos.length > 5 ? `${digitos.slice(0, 5)}-${digitos.slice(5)}` : digitos
}

export class PaginaClientes extends Componente {
  private readonly servico = new ServicoClientes()
  private readonly toasts = new AreaToast()
  private clientes: readonly Cliente[] = []
  private dadosDeExemplo = false
  private avisoExibido = false
  private busca = ''
  private selecionado: number | null = null
  private ativa = false
  private modal: Modal | null = null
  private campos: CamposFormulario | null = null
  private campoBusca: Campo | null = null
  private areaLista: HTMLElement | null = null
  private aviso: HTMLElement | null = null

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
  }

  protected aoMontar(): void {
    this.ativa = true
    this.toasts.montarFilho(document.body)
    document.addEventListener('keydown', this.aoTeclado)
    void this.carregar()
  }

  protected aoDesmontar(): void {
    this.ativa = false
    document.removeEventListener('keydown', this.aoTeclado)
    this.modal?.fechar()
    this.modal = null
    this.toasts.destruir()
  }

  private readonly aoTeclado = (evento: KeyboardEvent): void => {
    if (!this.ativa || this.modal !== null) {
      return
    }

    const alvo = evento.target
    const digitando =
      alvo instanceof HTMLInputElement ||
      alvo instanceof HTMLSelectElement ||
      alvo instanceof HTMLTextAreaElement
    const ctrl = evento.ctrlKey || evento.metaKey

    if (evento.key === 'Escape') {
      this.limparFormulario()
      return
    }
    if (evento.key === 'F5') {
      evento.preventDefault()
      void this.recarregar()
      return
    }
    if (ctrl && evento.key.toLowerCase() === 'n') {
      evento.preventDefault()
      this.novoCliente()
      return
    }
    if (ctrl && evento.key.toLowerCase() === 'k') {
      evento.preventDefault()
      this.campoBusca?.focar()
      return
    }
    if (evento.key === 'F2') {
      evento.preventDefault()
      this.editarSelecionado()
      return
    }
    if (ctrl && evento.key === 'Enter') {
      evento.preventDefault()
      this.avisarCep()
      return
    }
    if (evento.key === 'Enter' && !digitando) {
      evento.preventDefault()
      this.avisarSalvar()
    }
  }

  private async carregar(): Promise<void> {
    this.mostrarCarregando()
    try {
      await this.buscar()
    } catch {
      if (this.ativa) {
        this.mostrarErro()
      }
      return
    }
    if (!this.ativa) {
      return
    }
    this.montarEstrutura()
    this.atualizarLista()
    if (this.dadosDeExemplo && !this.avisoExibido) {
      this.avisoExibido = true
      this.toasts.exibir({
        tom: 'alerta',
        titulo: 'Dados de exemplo',
        mensagem: 'A API de clientes não respondeu. Exibindo cadastros locais.',
      })
    }
  }

  private async recarregar(): Promise<void> {
    if (this.areaLista === null) {
      await this.carregar()
      return
    }

    const area = criarElemento('div')
    new Carregando({ mensagem: 'Atualizando clientes…' }).montar(area)
    substituirConteudo(this.areaLista, area)

    try {
      await this.buscar()
    } catch {
      if (this.ativa) {
        this.mostrarErro()
      }
      return
    }
    if (!this.ativa) {
      return
    }
    if (this.aviso !== null) {
      this.aviso.className = this.dadosDeExemplo ? CLASSES.avisoExemplo : CLASSES.oculto
    }
    this.atualizarLista()
  }

  private async buscar(): Promise<void> {
    const resultado = await this.servico.listarComFonte()
    this.clientes = resultado.clientes
    this.dadosDeExemplo = resultado.dadosDeExemplo
  }

  private criarCabecalho(): HTMLElement {
    this.aviso = criarElemento('span', {
      className: this.dadosDeExemplo ? CLASSES.avisoExemplo : CLASSES.oculto,
      texto: 'dados de exemplo',
    })
    return criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Clientes' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Cadastro rápido e busca para o balcão.',
            }),
          ],
        }),
        this.aviso,
      ],
    })
  }

  private mostrarCarregando(): void {
    this.campos = null
    this.campoBusca = null
    this.areaLista = null
    this.aviso = null
    const area = criarElemento('div')
    new Carregando({ mensagem: 'Carregando clientes…' }).montar(area)
    substituirConteudo(this.elemento, this.criarCabecalho(), area)
  }

  private mostrarErro(): void {
    const area = criarElemento('div')
    new EstadoErro({
      titulo: 'Não foi possível carregar os clientes',
      mensagem: 'Verifique a conexão com a API de clientes e tente novamente.',
      aoTentar: () => {
        void this.carregar()
      },
    }).montar(area)
    substituirConteudo(this.elemento, area)
  }

  private criarFormulario(): HTMLElement {
    const nome = new Campo({
      id: 'clientes-nome',
      rotulo: 'Nome',
      placeholder: 'Nome completo',
      obrigatorio: true,
    })
    const cep = new Campo({
      id: 'clientes-cep',
      rotulo: 'CEP',
      placeholder: '00000-000',
      aoAlterar: (valor) => {
        const formatado = mascararCep(valor)
        if (formatado !== valor) {
          cep.definirValor(formatado)
        }
      },
    })
    const logradouro = new Campo({
      id: 'clientes-logradouro',
      rotulo: 'Logradouro',
      placeholder: 'Rua, avenida…',
    })
    const numero = new Campo({ id: 'clientes-numero', rotulo: 'Número', placeholder: '000' })
    const complemento = new Campo({
      id: 'clientes-complemento',
      rotulo: 'Complemento',
      placeholder: 'Apto, bloco…',
    })
    const bairro = new Campo({ id: 'clientes-bairro', rotulo: 'Bairro', placeholder: 'Bairro' })
    const cidade = new Campo({ id: 'clientes-cidade', rotulo: 'Cidade', placeholder: 'Cidade' })
    const uf = new Select({ id: 'clientes-uf', rotulo: 'UF', placeholder: '—', opcoes: UFS })
    const email = new Campo({
      id: 'clientes-email',
      rotulo: 'Email',
      tipo: 'email',
      placeholder: 'nome@exemplo.com',
    })
    const telefone = new Campo({
      id: 'clientes-telefone',
      rotulo: 'Telefone',
      tipo: 'tel',
      placeholder: '(00) 00000-0000',
    })

    this.campos = {
      nome,
      cep,
      logradouro,
      numero,
      complemento,
      bairro,
      cidade,
      uf,
      email,
      telefone,
    }

    const cepComBotao = criarElemento('div', {
      className: CLASSES.cepLinha,
      filhos: [
        criarElemento('div', { className: CLASSES.cepCampo, filhos: [cep.raiz] }),
        new Botao({
          texto: 'Buscar CEP',
          variante: 'secundario',
          aoClicar: () => {
            this.avisarCep()
          },
        }).raiz,
      ],
    })

    const bairroCidade = criarElemento('div', {
      className: CLASSES.linhaDois,
      filhos: [bairro.raiz, cidade.raiz],
    })
    const ufEmail = criarElemento('div', {
      className: CLASSES.linhaDois,
      filhos: [uf.raiz, email.raiz],
    })

    const formulario = criarElemento('form', {
      className: CLASSES.formulario,
      filhos: [
        nome.raiz,
        cepComBotao,
        logradouro.raiz,
        criarElemento('div', {
          className: CLASSES.linhaDois,
          filhos: [numero.raiz, complemento.raiz],
        }),
        bairroCidade,
        ufEmail,
        telefone.raiz,
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [
            new Botao({
              texto: 'Cancelar',
              variante: 'secundario',
              aoClicar: () => {
                this.limparFormulario()
              },
            }).raiz,
            new Botao({
              texto: 'Salvar',
              aoClicar: () => {
                this.avisarSalvar()
              },
            }).raiz,
          ],
        }),
      ],
    })
    formulario.addEventListener('submit', (evento) => evento.preventDefault())
    return formulario
  }

  private montarEstrutura(): void {
    this.campoBusca = new Campo({
      id: 'clientes-busca',
      rotulo: 'Buscar cliente',
      placeholder: 'Nome, cidade ou telefone',
      icone: ICONE_BUSCA,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarLista()
      },
    })

    const painelFormulario = criarElemento('div', {
      className: CLASSES.card,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Novo cliente' }),
        criarElemento('p', {
          className: CLASSES.instrucao,
          texto: 'Preencha os dados para iniciar um cadastro.',
        }),
        this.criarFormulario(),
      ],
    })

    this.areaLista = criarElemento('div', { className: CLASSES.lista })
    const painelLista = criarElemento('div', {
      className: CLASSES.lista,
      filhos: [
        criarElemento('div', {
          className: CLASSES.cabecalhoLista,
          filhos: [
            criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Clientes' }),
            new Botao({
              texto: 'Novo cliente',
              aoClicar: () => {
                this.novoCliente()
              },
            }).raiz,
          ],
        }),
        criarElemento('div', {
          className: CLASSES.campoBusca,
          filhos: [this.campoBusca.raiz],
        }),
        this.areaLista,
      ],
    })

    substituirConteudo(
      this.elemento,
      this.criarCabecalho(),
      criarElemento('div', {
        className: CLASSES.grade,
        filhos: [painelFormulario, painelLista],
      }),
    )
  }

  private colunas(): readonly ColunaTabela<LinhaCliente>[] {
    return [
      { chave: 'nome', rotulo: 'Nome', ordenavel: true },
      {
        chave: 'telefone',
        rotulo: 'Fone',
        celula: (linha) => valorOuTraco(linha.telefone),
      },
      {
        chave: 'cidade',
        rotulo: 'Cidade',
        ordenavel: true,
        celula: (linha) => valorOuTraco(linha.cidade),
      },
      {
        chave: 'id',
        rotulo: 'Ações',
        celula: (linha) =>
          new Botao({
            texto: 'Ver',
            variante: 'ghost',
            aoClicar: () => {
              this.abrirDetalhes(linha.id)
            },
          }).raiz,
      },
    ]
  }

  private atualizarLista(): void {
    if (this.areaLista === null) {
      return
    }

    const filtrados = this.filtrar()
    const linhas: LinhaCliente[] = filtrados.map((cliente) => ({
      id: cliente.id,
      nome: cliente.nome,
      telefone: cliente.telefone ?? '',
      cidade: cliente.cidade ?? '',
    }))

    substituirConteudo(
      this.areaLista,
      criarElemento('p', {
        className: CLASSES.contador,
        texto: `${filtrados.length} cliente${filtrados.length === 1 ? '' : 's'}`,
      }),
    )

    if (filtrados.length === 0) {
      const area = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhum cliente cadastrado',
        mensagem: 'Cadastre um cliente para agilizar a locação no balcão.',
        acao: {
          texto: 'Novo cliente',
          aoClicar: () => {
            this.novoCliente()
          },
        },
      }).montar(area)
      this.areaLista.append(area)
      return
    }

    this.areaLista.append(
      new Tabela<LinhaCliente>({
        colunas: this.colunas(),
        linhas,
        mensagemVazia: 'Nenhum cliente com esse filtro.',
        aoSelecionar: (linha) => {
          this.selecionado = linha.id
        },
      }).raiz,
    )
  }

  private filtrar(): readonly Cliente[] {
    const termo = normalizar(this.busca.trim())
    if (termo === '') {
      return this.clientes
    }
    return this.clientes.filter((cliente) =>
      [cliente.nome, cliente.telefone, cliente.cidade, cliente.email].some(
        (campo) => campo !== null && campo !== undefined && normalizar(campo).includes(termo),
      ),
    )
  }

  private abrirDetalhes(id: number): void {
    const cliente = this.clientes.find((item) => item.id === id)
    if (cliente === undefined) {
      return
    }
    this.selecionado = id
    this.modal?.fechar()

    const detalhes = criarElemento('dl', {
      className: CLASSES.detalhes,
      filhos: [
        this.campoDetalhe('Nome', cliente.nome),
        this.campoDetalhe('Telefone', cliente.telefone),
        this.campoDetalhe('Email', cliente.email),
        this.campoDetalhe('CEP', cliente.cep),
        this.campoDetalhe('Logradouro', cliente.logradouro),
        this.campoDetalhe('Número', cliente.numero),
        this.campoDetalhe('Complemento', cliente.complemento),
        this.campoDetalhe('Bairro', cliente.bairro),
        this.campoDetalhe('Cidade', cliente.cidade),
        this.campoDetalhe('UF', cliente.uf),
      ],
    })

    this.modal = new Modal({
      id: 'clientes-detalhes',
      titulo: cliente.nome,
      conteudo: detalhes,
      rodape: [
        new Botao({
          texto: 'Fechar',
          variante: 'secundario',
          aoClicar: () => {
            this.modal?.fechar()
          },
        }).raiz,
      ],
    })
    this.modal.abrir()
  }

  private campoDetalhe(rotulo: string, valor: string | null | undefined): HTMLElement {
    return criarElemento('div', {
      filhos: [
        criarElemento('dt', { className: CLASSES.detalheRotulo, texto: rotulo }),
        criarElemento('dd', { className: CLASSES.detalheValor, texto: valorOuTraco(valor) }),
      ],
    })
  }

  private editarSelecionado(): void {
    const cliente = this.clientes.find((item) => item.id === this.selecionado)
    if (cliente === undefined || this.campos === null) {
      this.toasts.exibir({
        tom: 'alerta',
        titulo: 'Nenhum cliente selecionado',
        mensagem: 'Selecione uma linha da tabela para preencher o formulário.',
      })
      return
    }
    this.preencherFormulario(cliente)
    this.campos.nome.focar()
  }

  private preencherFormulario(cliente: Cliente): void {
    if (this.campos === null) {
      return
    }
    this.campos.nome.definirValor(cliente.nome)
    this.campos.cep.definirValor(cliente.cep ?? '')
    this.campos.logradouro.definirValor(cliente.logradouro ?? '')
    this.campos.numero.definirValor(cliente.numero ?? '')
    this.campos.complemento.definirValor(cliente.complemento ?? '')
    this.campos.bairro.definirValor(cliente.bairro ?? '')
    this.campos.cidade.definirValor(cliente.cidade ?? '')
    this.campos.uf.definirValor(cliente.uf ?? '')
    this.campos.email.definirValor(cliente.email ?? '')
    this.campos.telefone.definirValor(cliente.telefone ?? '')
    this.selecionado = cliente.id
  }

  private novoCliente(): void {
    this.limparFormulario()
    this.campos?.nome.focar()
  }

  private limparFormulario(): void {
    if (this.campos === null) {
      return
    }
    const campos: ReadonlyArray<Campo | Select> = [
      this.campos.nome,
      this.campos.cep,
      this.campos.logradouro,
      this.campos.numero,
      this.campos.complemento,
      this.campos.bairro,
      this.campos.cidade,
      this.campos.uf,
      this.campos.email,
      this.campos.telefone,
    ]
    for (const campo of campos) {
      campo.definirValor('')
      campo.definirErro(null)
    }
    this.selecionado = null
  }

  private avisarCep(): void {
    this.toasts.exibir({
      tom: 'alerta',
      titulo: 'Consulta de CEP indisponível',
      mensagem: 'Preencha o endereço manualmente. A busca por CEP ainda não está disponível.',
    })
  }

  private avisarSalvar(): void {
    this.toasts.exibir({
      tom: 'alerta',
      titulo: 'Cadastro ainda indisponível',
      mensagem: 'Não foi possível salvar. A gravação de clientes ainda não está disponível.',
    })
  }
}
