import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
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
  Tabela,
} from '../componentes'
import type { ColunaTabela } from '../componentes'
import {
  Componente,
  criarElemento,
  ehAdministrador,
  observarPerfil,
  registrarAtalhos,
  substituirConteudo,
} from '../nucleo'
import { ServicoClientes } from '../servicos'
import { codigoErro, formatadorPtBr, mensagemErroOperacao } from '../util'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoSemPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeContainer: 'max-w-2xl',
  gradeCampos: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  cepLinha: 'flex flex-col gap-2',
  cepAcoes: 'flex items-end gap-2',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  cabecalhoFixo: 'sticky top-0 z-10 bg-floresta text-pedra',
  avisoDesatualizado:
    'inline-flex items-center gap-2 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
  botaoManual:
    'self-start rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  oculto: 'hidden',
  textoLeitura: 'text-sm text-grafite',
} as const

const ICONE_BUSCA = 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z'

interface FormularioCliente {
  nome: string
  cpf: string
  telefone: string
  email: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

type ChaveCampoCliente = keyof FormularioCliente

type CamposCliente = Readonly<Record<ChaveCampoCliente, Campo>>

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

function formularioVazio(): FormularioCliente {
  return {
    nome: '',
    cpf: '',
    telefone: '',
    email: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  }
}

function formularioDe(cliente: Cliente): FormularioCliente {
  return {
    nome: cliente.nome,
    cpf: formatadorPtBr.cpf(cliente.cpf),
    telefone: formatadorPtBr.telefone(cliente.telefone ?? ''),
    email: cliente.email ?? '',
    cep: formatadorPtBr.cep(cliente.cep ?? ''),
    logradouro: cliente.logradouro ?? '',
    numero: cliente.numero ?? '',
    complemento: cliente.complemento ?? '',
    bairro: cliente.bairro ?? '',
    cidade: cliente.cidade ?? '',
    uf: cliente.uf ?? '',
  }
}

function opcional(valor: string): string | null {
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function normalizarUf(valor: string): string {
  return valor.trim().toUpperCase()
}

const COLUNAS: readonly ColunaTabela<Cliente>[] = [
  { chave: 'nome', rotulo: 'Nome', ordenavel: true },
  { chave: 'telefone', rotulo: 'Telefone', celula: (linha) => formatadorPtBr.telefone(linha.telefone ?? '') },
  { chave: 'cidade', rotulo: 'Cidade', ordenavel: true },
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

export class PaginaClientes extends Componente {
  private readonly servico = new ServicoClientes()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private registros: readonly Cliente[] = []
  private selecionado: Cliente | null = null
  private editandoId: number | null = null
  private formulario: FormularioCliente = formularioVazio()
  private campos: CamposCliente | null = null
  private campoCep: Campo | null = null
  private botaoManual: HTMLElement | null = null
  private painel: PainelFormulario | null = null
  private painelSlot: HTMLElement | null = null
  private areaTabela: HTMLElement | null = null
  private areaConteudo: HTMLElement | null = null
  private campoBusca: Campo | null = null
  private modal: Modal | null = null
  private busca = ''
  private carregando = true
  private falhaLista: string | null = null
  private painelOculto = false
  private cepConsultado = ''

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
      aoCancelar: () => this.cancelarEdicao(),
      emCampo: () => false,
      modalAberto: () => this.modal !== null,
    })
    this.cancelarPerfil = observarPerfil(() => {
      if (!this.carregando) {
        this.montarEstrutura()
      }
    })
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
    this.toasts.destruir()
  }

  private async recarregar(): Promise<void> {
    this.carregando = true
    this.falhaLista = null
    this.montarEstrutura()

    try {
      this.registros = await this.servico.listar()
    } catch {
      this.falhaLista = 'Não foi possível carregar os clientes. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: 'Não foi possível carregar os clientes. Tente novamente.',
        tom: 'erro',
      })
    } finally {
      this.carregando = false
      if (this.selecionado !== null) {
        const atual = this.registros.find((cliente) => cliente.id === this.selecionado?.id)
        this.selecionado = atual ?? null
        if (atual !== undefined) {
          this.formulario = formularioDe(atual)
        } else {
          this.editandoId = null
        }
      }
      this.painelOculto = this.registros.length === 0 && this.editandoId === null
      this.montarEstrutura()
    }
  }

  private montarEstrutura(): void {
    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Clientes' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Cadastro rápido por CEP e consulta no balcão.',
            }),
          ],
        }),
        new Botao({ texto: 'Novo cliente', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.campoBusca = new Campo({
      id: 'clientes-busca',
      rotulo: 'Buscar cliente',
      placeholder: 'Nome, CPF ou cidade',
      icone: ICONE_BUSCA,
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarTabela()
      },
    })

    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [this.campoBusca.raiz],
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
    if (this.painelSlot === null || this.areaConteudo === null) {
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
    if (ehAdministrador() && this.selecionado !== null) {
      acoesCabecalho.push(
        new Botao({
          texto: 'Inativar',
          variante: 'ghost',
          aoClicar: () => this.confirmarInativacao(),
        }).raiz,
      )
    }

    this.painel = new PainelFormulario({
      id: 'clientes-formulario',
      titulo: this.editandoId === null ? 'Novo cliente' : 'Editar cliente',
      corpo: criarElemento('div', { className: CLASSES.gradeContainer, filhos: [corpo] }),
      rodape: [
        new Botao({ texto: 'Cancelar', variante: 'secundario', aoClicar: () => this.cancelarEdicao() }).raiz,
        new Botao({ texto: 'Salvar', aoClicar: () => void this.salvar() }).raiz,
      ],
      acoesCabecalho,
      carregando: this.carregando,
      desabilitado: this.carregando,
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
    const campos: Record<ChaveCampoCliente, Campo> = {
      nome: new Campo({
        id: 'cliente-nome',
        rotulo: 'Nome',
        obrigatorio: true,
        valorInicial: estado.nome,
        placeholder: 'Nome completo',
        aoAlterar: (valor) => {
          estado.nome = valor
          campos.nome.definirErro(null)
        },
      }),
      cpf: new Campo({
        id: 'cliente-cpf',
        rotulo: 'CPF',
        obrigatorio: true,
        valorInicial: estado.cpf,
        placeholder: '000.000.000-00',
        aoAlterar: (valor) => {
          estado.cpf = valor
          campos.cpf.definirValor(formatadorPtBr.cpf(valor))
          campos.cpf.definirErro(null)
        },
      }),
      telefone: new Campo({
        id: 'cliente-telefone',
        rotulo: 'Telefone',
        tipo: 'tel',
        valorInicial: estado.telefone,
        placeholder: '(11) 99999-9999',
        aoAlterar: (valor) => {
          estado.telefone = valor
          campos.telefone.definirValor(formatadorPtBr.telefone(valor))
        },
      }),
      email: new Campo({
        id: 'cliente-email',
        rotulo: 'E-mail',
        tipo: 'email',
        valorInicial: estado.email,
        placeholder: 'nome@email.com',
        aoAlterar: (valor) => {
          estado.email = valor
          campos.email.definirErro(null)
        },
      }),
      cep: new Campo({
        id: 'cliente-cep',
        rotulo: 'CEP',
        valorInicial: estado.cep,
        placeholder: '00000-000',
        aoAlterar: (valor) => {
          estado.cep = valor
          campos.cep.definirValor(formatadorPtBr.cep(valor))
          campos.cep.definirErro(null)
          void this.buscarCepQuandoCompleto(valor)
        },
      }),
      logradouro: new Campo({
        id: 'cliente-logradouro',
        rotulo: 'Logradouro',
        valorInicial: estado.logradouro,
        placeholder: 'Rua, avenida…',
        aoAlterar: (valor) => {
          estado.logradouro = valor
        },
      }),
      numero: new Campo({
        id: 'cliente-numero',
        rotulo: 'Número',
        valorInicial: estado.numero,
        placeholder: '123',
        aoAlterar: (valor) => {
          estado.numero = valor
        },
      }),
      complemento: new Campo({
        id: 'cliente-complemento',
        rotulo: 'Complemento',
        valorInicial: estado.complemento,
        placeholder: 'Apto, bloco…',
        aoAlterar: (valor) => {
          estado.complemento = valor
        },
      }),
      bairro: new Campo({
        id: 'cliente-bairro',
        rotulo: 'Bairro',
        valorInicial: estado.bairro,
        placeholder: 'Centro',
        aoAlterar: (valor) => {
          estado.bairro = valor
        },
      }),
      cidade: new Campo({
        id: 'cliente-cidade',
        rotulo: 'Cidade',
        valorInicial: estado.cidade,
        placeholder: 'São Paulo',
        aoAlterar: (valor) => {
          estado.cidade = valor
        },
      }),
      uf: new Campo({
        id: 'cliente-uf',
        rotulo: 'UF',
        valorInicial: normalizarUf(estado.uf),
        placeholder: 'SP',
        aoAlterar: (valor) => {
          const uf = normalizarUf(valor)
          estado.uf = uf
          campos.uf.definirValor(uf)
          campos.uf.definirErro(null)
        },
      }),
    }

    this.campos = campos
    this.campoCep = campos.cep
    this.botaoManual = criarElemento('button', {
      className: CLASSES.oculto,
      atributos: { type: 'button' },
      texto: 'Preencher manualmente',
    })
    const botaoManual = this.botaoManual
    botaoManual.addEventListener('click', () => {
      campos.cep.definirErro(null)
      botaoManual.className = CLASSES.oculto
      campos.logradouro.focar()
    })

    const botaoCep = new Botao({
      texto: 'Buscar CEP',
      variante: 'secundario',
      aoClicar: () => {
        void this.buscarCepQuandoCompleto(campos.cep.valor(), true)
      },
    })

    return criarElemento('div', {
      className: CLASSES.gradeCampos,
      filhos: [
        campos.nome.raiz,
        campos.cpf.raiz,
        criarElemento('div', {
          className: CLASSES.cepLinha,
          filhos: [
            criarElemento('div', {
              className: CLASSES.cepAcoes,
              filhos: [campos.cep.raiz, botaoCep.raiz],
            }),
            this.botaoManual,
          ],
        }),
        campos.logradouro.raiz,
        campos.numero.raiz,
        campos.complemento.raiz,
        campos.bairro.raiz,
        campos.cidade.raiz,
        campos.uf.raiz,
        campos.telefone.raiz,
        campos.email.raiz,
      ],
    })
  }

  private async buscarCepQuandoCompleto(valor: string, forcar = false): Promise<void> {
    const digitos = formatadorPtBr.digitos(valor)
    if (digitos.length !== 8) {
      this.cepConsultado = ''
      return
    }
    if (!forcar && this.cepConsultado === digitos) {
      return
    }
    this.cepConsultado = digitos

    try {
      const endereco = await this.servico.buscarCep(digitos)
      this.formulario.logradouro = endereco.logradouro ?? ''
      this.formulario.bairro = endereco.bairro ?? ''
      this.formulario.cidade = endereco.cidade ?? ''
      this.formulario.uf = normalizarUf(endereco.uf ?? '')
      this.campos?.logradouro.definirValor(this.formulario.logradouro)
      this.campos?.bairro.definirValor(this.formulario.bairro)
      this.campos?.cidade.definirValor(this.formulario.cidade)
      this.campos?.uf.definirValor(this.formulario.uf)
      this.campos?.uf.definirErro(null)
      this.campoCep?.definirErro(null)
      if (this.botaoManual !== null) {
        this.botaoManual.className = CLASSES.oculto
      }
      this.toasts.exibir({
        titulo: 'CEP localizado',
        mensagem: 'Endereço preenchido. Confira o número e o complemento.',
        tom: 'sucesso',
      })
    } catch (erro) {
      const naoEncontrado = codigoErro(erro) === 'CEP_INVALIDO'
      this.campoCep?.definirErro(
        naoEncontrado
          ? 'CEP não encontrado. Preencha o endereço manualmente.'
          : 'Não foi possível consultar o CEP. Verifique sua conexão e tente novamente.',
      )
      if (this.botaoManual !== null) {
        this.botaoManual.className = CLASSES.botaoManual
      }
      this.toasts.exibir({
        titulo: naoEncontrado ? 'CEP não encontrado' : 'Falha ao consultar o CEP',
        mensagem: naoEncontrado
          ? 'Preencha o endereço manualmente para continuar.'
          : 'Verifique sua conexão e tente novamente.',
        tom: naoEncontrado ? 'alerta' : 'erro',
      })
    }
  }

  private atualizarTabela(): void {
    if (this.areaTabela === null) {
      return
    }

    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.coluna })
      new Carregando({ mensagem: 'Carregando clientes…', variante: 'skeleton', linhas: 3 }).montar(
        area,
      )
      this.areaTabela.replaceChildren(area)
      return
    }

    if (this.falhaLista !== null && this.registros.length === 0) {
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
      const area = criarElemento('div')
      new EstadoVazio({
        ilustracao: 'pessoas',
        titulo: 'Nenhum cliente cadastrado',
        mensagem:
          this.busca.trim() === ''
            ? 'Cadastre o primeiro cliente para começar uma locação.'
            : 'Nenhum cliente com esses filtros. Tente outro termo ou cadastre um novo.',
        acao: {
          texto: this.busca.trim() === '' ? 'Novo cliente' : 'Limpar filtros',
          aoClicar: () => {
            if (this.busca.trim() === '') {
              this.novo()
              return
            }
            this.busca = ''
            this.campoBusca?.definirValor('')
            this.atualizarTabela()
          },
        },
      }).montar(area)
      this.areaTabela.replaceChildren(area)
      return
    }

    const tabela = new Tabela<Cliente>({
      colunas: [
        ...COLUNAS,
        {
          chave: 'atualizadoEm',
          rotulo: 'Ações',
          celula: (linha) => this.criarAcoes(linha),
        },
      ],
      linhas: filtrados,
      mensagemVazia: 'Nenhum cliente cadastrado.',
      aoSelecionar: (linha) => this.selecionar(linha),
      linhaSelecionada: (linha) => this.selecionado?.id === linha.id,
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

  private criarAcoes(cliente: Cliente): HTMLElement {
    const container = criarElemento('div', { className: CLASSES.acoes })

    const editar = criarElemento('button', {
      className: CLASSES.acao,
      atributos: { type: 'button' },
      texto: 'Editar',
    })
    editar.addEventListener('click', (evento) => {
      evento.stopPropagation()
      this.selecionar(cliente)
      this.editarSelecionado()
    })
    container.append(editar)

    if (ehAdministrador()) {
      const inativar = criarElemento('button', {
        className: CLASSES.acaoPerigo,
        atributos: { type: 'button' },
        texto: 'Inativar',
      })
      inativar.disabled = !cliente.ativo
      inativar.addEventListener('click', (evento) => {
        evento.stopPropagation()
        this.selecionar(cliente)
        this.confirmarInativacao()
      })
      container.append(inativar)
    }

    return container
  }

  private filtrar(): readonly Cliente[] {
    const termo = this.busca.trim().toLocaleLowerCase('pt-BR')
    if (termo === '') {
      return this.registros
    }
    return this.registros.filter((cliente) =>
      [cliente.nome, cliente.cpf, cliente.cidade ?? ''].some((valor) =>
        valor.toLocaleLowerCase('pt-BR').includes(termo),
      ),
    )
  }

  private selecionar(cliente: Cliente): void {
    this.selecionado = cliente
    this.formulario = formularioDe(cliente)
    this.editandoId = cliente.id
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
  }

  private novo(): void {
    this.selecionado = null
    this.editandoId = null
    this.formulario = formularioVazio()
    this.cepConsultado = ''
    this.painelOculto = false
    this.atualizarPainel()
    this.atualizarTabela()
    this.painel?.focarPrimeiroControle()
  }

  private editarSelecionado(): void {
    if (this.selecionado === null) {
      this.toasts.exibir({
        mensagem: 'Selecione um cliente na tabela antes de editar.',
        tom: 'alerta',
      })
      return
    }
    this.selecionar(this.selecionado)
    this.painel?.focarPrimeiroControle()
  }

  private confirmarSelecionado(): void {
    if (this.selecionado !== null) {
      this.selecionar(this.selecionado)
      return
    }
    this.novo()
  }

  private cancelarEdicao(): void {
    if (this.editandoId !== null || this.selecionado !== null) {
      this.novo()
      return
    }
    if (this.busca !== '') {
      this.busca = ''
      this.campoBusca?.definirValor('')
      this.atualizarTabela()
    }
  }

  private validar(): boolean {
    const campos = this.campos
    if (campos === null) {
      return false
    }

    let valido = true
    const marcar = (campo: Campo, mensagem: string | null): void => {
      campo.definirErro(mensagem)
      if (mensagem !== null) {
        valido = false
      }
    }

    marcar(campos.nome, this.formulario.nome.trim() === '' ? 'Informe o nome.' : null)
    const cpfDigitos = formatadorPtBr.digitos(this.formulario.cpf)
    marcar(
      campos.cpf,
      cpfDigitos.length !== 11 ? 'Informe um CPF com 11 dígitos.' : null,
    )
    const cepDigitos = formatadorPtBr.digitos(this.formulario.cep)
    marcar(
      campos.cep,
      cepDigitos !== '' && cepDigitos.length !== 8 ? 'Informe um CEP com 8 dígitos.' : null,
    )
    const email = this.formulario.email.trim()
    marcar(
      campos.email,
      email !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        ? 'Informe um e-mail válido.'
        : null,
    )
    const uf = this.formulario.uf.trim()
    marcar(
      campos.uf,
      uf !== '' && !/^[A-Za-z]{2}$/.test(uf)
        ? 'Informe a UF com 2 letras (ex.: SP).'
        : null,
    )
    return valido
  }

  private async salvar(): Promise<void> {
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

    const uf = normalizarUf(this.formulario.uf)
    this.formulario.uf = uf
    this.campos?.uf.definirValor(uf)

    const dadosComuns = {
      nome: this.formulario.nome.trim(),
      cpf: formatadorPtBr.digitos(this.formulario.cpf),
      telefone: opcional(formatadorPtBr.digitos(this.formulario.telefone)),
      email: opcional(this.formulario.email),
      cep: opcional(formatadorPtBr.digitos(this.formulario.cep)),
      logradouro: opcional(this.formulario.logradouro),
      numero: opcional(this.formulario.numero),
      complemento: opcional(this.formulario.complemento),
      bairro: opcional(this.formulario.bairro),
      cidade: opcional(this.formulario.cidade),
      uf: opcional(uf),
    }

    try {
      let salvo: Cliente
      if (this.editandoId === null) {
        const criar: ClienteCriarEntrada = dadosComuns
        salvo = await this.servico.criar(criar)
      } else {
        const atualizar: ClienteAtualizarEntrada = { id: this.editandoId, ...dadosComuns }
        salvo = await this.servico.atualizar(atualizar)
      }
      this.toasts.exibir({
        titulo: 'Cliente salvo',
        mensagem: 'Cadastro atualizado com sucesso.',
        tom: 'sucesso',
      })
      this.busca = ''
      this.campoBusca?.definirValor('')
      this.novo()
      await this.recarregar()
      const registro = this.registros.find((cliente) => cliente.id === salvo.id) ?? salvo
      this.selecionar(registro)
    } catch {
      this.painel?.definirErro(true)
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: 'Verifique os dados e tente novamente.',
        tom: 'erro',
      })
    }
  }

  private confirmarInativacao(): void {
    const cliente = this.selecionado
    if (!ehAdministrador() || cliente === null || !cliente.ativo) {
      return
    }
    this.confirmar({
      titulo: 'Inativar cliente',
      mensagem: `Inativar ${cliente.nome}? O cliente deixará de aparecer nas consultas.`,
      rotulo: 'Inativar',
      acao: () => {
        void (async () => {
          try {
            await this.servico.inativar(cliente.id)
            this.toasts.exibir({
              titulo: 'Cliente inativado',
              mensagem: 'O registro não aparecerá mais nas consultas.',
              tom: 'sucesso',
            })
            this.novo()
            await this.recarregar()
          } catch (erro) {
            this.toasts.exibir({
              titulo: 'Não foi possível inativar',
              mensagem: mensagemErroOperacao(erro, 'o cliente'),
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
      id: 'clientes-confirmacao',
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
