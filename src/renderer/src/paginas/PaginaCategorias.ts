import type { Categoria } from '../../../shared/contratos/modelos'
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
import { ServicoCategorias } from '../servicos'
import { filtrarPorTexto, mensagemErroOperacao } from '../util'

const CLASSES = {
  pagina: 'flex h-full min-h-0 flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  filtros: 'max-w-md',
  conteudoComPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-2',
  conteudoSemPainel: 'grid min-h-0 flex-1 grid-cols-1 gap-6',
  coluna: 'flex min-h-0 min-w-0 flex-col gap-3',
  gradeCampos: 'flex flex-col gap-4',
  tabelaScroll: 'max-h-96 overflow-y-auto',
  acao:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  acaoPerigo:
    'inline-flex items-center rounded-control px-2 py-1 text-xs font-semibold text-erro transition-colors motion-reduce:transition-none hover:bg-erro-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
  acoes: 'flex flex-wrap items-center gap-1',
  avisoErro: 'text-sm text-erro',
} as const

const COLUNAS: readonly ColunaTabela<Categoria>[] = [
  { chave: 'nome', rotulo: 'Nome', ordenavel: true },
  {
    chave: 'descricao',
    rotulo: 'Descrição',
    celula: (linha) => linha.descricao ?? '—',
  },
  {
    chave: 'id',
    rotulo: 'Código',
    ordenavel: true,
    alinhamento: 'direita',
    celula: (linha) => `#${String(linha.id)}`,
  },
]

interface Confirmacao {
  readonly titulo: string
  readonly mensagem: string
  readonly rotulo: string
  readonly acao: () => void
}

export class PaginaCategorias extends Componente {
  private readonly servico = new ServicoCategorias()
  private readonly toasts = new AreaToast()
  private readonly cancelarAtalhos: () => void
  private readonly cancelarPerfil: () => void

  private registros: readonly Categoria[] = []
  private selecionado: Categoria | null = null
  private editandoId: number | null = null
  private busca = ''
  private carregando = true
  private salvando = false
  private falhaLista: string | null = null
  private modal: Modal | null = null
  private campoBusca: Campo | null = null
  private campos: { nome: Campo; descricao: Campo } | null = null
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
      this.registros = await this.servico.listar()
    } catch {
      this.registros = []
      this.falhaLista = 'Não foi possível carregar as categorias. Tente novamente.'
      this.toasts.exibir({
        titulo: 'Falha ao carregar',
        mensagem: this.falhaLista,
        tom: 'erro',
      })
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
        mensagem: 'Somente o administrador pode consultar e cadastrar categorias.',
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
      id: 'categoria-busca',
      rotulo: 'Buscar categoria',
      placeholder: 'Nome da categoria',
      icone: 'M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z',
      valorInicial: this.busca,
      aoAlterar: (valor) => {
        this.busca = valor
        this.atualizarTabela()
      },
    })

    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Categorias' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Organize os equipamentos por categoria.',
            }),
          ],
        }),
        new Botao({ texto: 'Nova categoria', aoClicar: () => this.novo() }).raiz,
      ],
    })

    this.areaTabela = criarElemento('div', { className: CLASSES.coluna })
    this.painelSlot = criarElemento('div', { className: CLASSES.coluna })
    const conteudo = criarElemento('div', {
      className: CLASSES.conteudoComPainel,
      filhos: [this.areaTabela, this.painelSlot],
    })

    substituirConteudo(
      this.elemento,
      cabecalho,
      criarElemento('div', { className: CLASSES.filtros, filhos: [this.campoBusca.raiz] }),
      conteudo,
    )
    this.montarTabela()
    this.montarPainel()
  }

  private montarTabela(): void {
    if (this.areaTabela === null) {
      return
    }
    this.areaTabela.replaceChildren()
    if (this.carregando) {
      const area = criarElemento('div')
      new Carregando({ mensagem: 'Carregando categorias…' }).montar(area)
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
        titulo: 'Nenhuma categoria encontrada',
        mensagem: 'Cadastre uma categoria para organizar a frota.',
      }).montar(area)
      this.areaTabela.append(area)
      return
    }
    const tabela = new Tabela<Categoria>({
      colunas: COLUNAS,
      linhas,
      aoSelecionar: (linha) => this.selecionar(linha),
      linhaSelecionada: (linha) => linha.id === this.selecionado?.id,
    })
    const scroll = criarElemento('div', { className: CLASSES.tabelaScroll, filhos: [tabela.raiz] })
    this.areaTabela.append(scroll)
    const botoes = criarElemento('div', {
      className: CLASSES.acoes,
      filhos: [
        this.criarAcao('Editar', () => this.editarSelecionado()),
        this.criarAcaoPerigo('Inativar', () => this.confirmarInativacao()),
      ],
    })
    this.areaTabela.append(botoes)
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

  private montarPainel(): void {
    if (this.painelSlot === null) {
      return
    }
    this.campos = {
      nome: new Campo({
        id: 'categoria-nome',
        rotulo: 'Nome',
        valorInicial: this.selecionado?.nome ?? '',
        obrigatorio: true,
        placeholder: 'Ex.: Camping',
      }),
      descricao: new Campo({
        id: 'categoria-descricao',
        rotulo: 'Descrição',
        valorInicial: this.selecionado?.descricao ?? '',
        placeholder: 'Opcional',
      }),
    }
    const grade = criarElemento('div', {
      className: CLASSES.gradeCampos,
      filhos: [this.campos.nome.raiz, this.campos.descricao.raiz],
    })
    const situacao =
      this.selecionado === null
        ? new Badge({ texto: 'Nova categoria', tom: 'neutro' }).raiz
        : new Badge({ texto: 'Cadastrada', tom: 'sucesso' }).raiz
    this.painel = new PainelFormulario({
      id: 'painel-categoria',
      titulo: this.editandoId === null ? 'Nova categoria' : 'Editar categoria',
      corpo: grade,
      rodape: [
        new Botao({ texto: 'Cancelar', variante: 'ghost', aoClicar: () => this.cancelarEdicao() })
          .raiz,
        new Botao({
          texto: this.editandoId === null ? 'Cadastrar' : 'Salvar',
          aoClicar: () => {
            void this.salvar()
          },
        }).raiz,
      ],
      acoesCabecalho: [situacao],
      carregando: this.carregando,
      desabilitado: this.carregando || this.salvando,
      selecionado: this.selecionado !== null,
    })
    this.painelSlot.replaceChildren(this.painel.raiz)
  }

  private atualizarTabela(): void {
    this.montarTabela()
  }

  private filtrar(): readonly Categoria[] {
    return filtrarPorTexto(this.registros, ['nome', 'descricao'], this.busca)
  }

  private selecionar(categoria: Categoria): void {
    this.selecionado = categoria
    this.editandoId = categoria.id
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
    this.campos?.nome.focar()
  }

  private editarSelecionado(): void {
    if (!ehAdministrador() || this.selecionado === null) {
      return
    }
    this.editandoId = this.selecionado.id
    this.montarPainel()
    this.campos?.nome.focar()
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
    const nome = campos.nome.valor().trim()
    campos.nome.definirErro(nome === '' ? 'Informe o nome da categoria.' : null)
    return nome !== ''
  }

  private async salvar(): Promise<void> {
    if (!ehAdministrador() || this.salvando || !this.validar() || this.campos === null) {
      return
    }
    const nome = this.campos.nome.valor().trim()
    const descricao = this.campos.descricao.valor().trim()
    this.salvando = true
    try {
      if (this.editandoId === null) {
        await this.servico.criar({ nome, descricao: descricao === '' ? null : descricao })
        this.toasts.exibir({
          titulo: 'Categoria cadastrada',
          mensagem: 'A categoria já pode ser usada nos equipamentos.',
          tom: 'sucesso',
        })
      } else {
        await this.servico.atualizar({
          id: this.editandoId,
          nome,
          descricao: descricao === '' ? null : descricao,
        })
        this.toasts.exibir({
          titulo: 'Categoria atualizada',
          mensagem: 'Alterações salvas.',
          tom: 'sucesso',
        })
      }
      this.cancelarEdicao()
      await this.recarregar()
    } catch (erro) {
      this.toasts.exibir({
        titulo: 'Não foi possível salvar',
        mensagem: mensagemErroOperacao(erro, 'a categoria'),
        tom: 'erro',
      })
    } finally {
      this.salvando = false
    }
  }

  private confirmarInativacao(): void {
    const categoria = this.selecionado
    if (!ehAdministrador() || categoria === null) {
      return
    }
    this.confirmar({
      titulo: 'Inativar categoria',
      mensagem: `Inativar "${categoria.nome}"? A categoria deixará de aparecer nas opções de cadastro. Equipamentos já vinculados permanecem intactos.`,
      rotulo: 'Inativar',
      acao: () => {
        void (async () => {
          try {
            await this.servico.inativar(categoria.id)
            this.toasts.exibir({
              titulo: 'Categoria inativada',
              mensagem: 'O registro não aparecerá mais nas opções de cadastro.',
              tom: 'sucesso',
            })
            this.cancelarEdicao()
            await this.recarregar()
          } catch (erro) {
            this.toasts.exibir({
              titulo: 'Não foi possível inativar',
              mensagem: mensagemErroOperacao(erro, 'a categoria'),
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
      id: 'confirmar-inativacao-categoria',
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
