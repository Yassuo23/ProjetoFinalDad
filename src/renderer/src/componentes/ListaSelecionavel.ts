import { Componente, criarElemento } from '../nucleo'
import type { OpcoesBotao } from './Botao'
import { Carregando } from './Carregando'
import { EstadoErro } from './EstadoErro'
import { EstadoVazio } from './EstadoVazio'

export interface OpcaoListaSelecionavel<T> {
  readonly item: T
  readonly rotulo: string
  readonly descricao?: string
  readonly conteudoDireita?: Node | string
  readonly desabilitado?: boolean
  readonly selecionado?: boolean
}

export interface OpcoesListaSelecionavel<T> {
  readonly id: string
  readonly rotulo: string
  readonly opcoes: readonly OpcaoListaSelecionavel<T>[]
  readonly aoSelecionar?: (item: T, indice: number) => void
  readonly tituloVazio?: string
  readonly mensagemVazia?: string
  readonly acaoVazio?: OpcoesBotao
  readonly carregando?: boolean
  readonly mensagemCarregando?: string
  readonly erro?: string
  readonly aoTentar?: () => void
}

/** DS 8.13 — classes literais para cada estado da opção. */
const CLASSES = {
  container:
    'w-full divide-y divide-granito/30 overflow-hidden rounded-card border border-granito/45 bg-superficie text-sm',
  opcao:
    'flex min-h-row w-full items-center gap-3 px-4 py-2 text-left text-sm text-grafite transition-colors hover:bg-pedra/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  opcaoSelecionada:
    'flex min-h-row w-full items-center gap-3 bg-lima/20 px-4 py-2 text-left text-sm text-floresta ring-1 ring-inset ring-floresta transition-colors hover:bg-lima/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  opcaoDesabilitada:
    'flex min-h-row w-full cursor-not-allowed items-center gap-3 px-4 py-2 text-left text-sm text-grafite opacity-60 transition-colors',
  opcaoSelecionadaDesabilitada:
    'flex min-h-row w-full cursor-not-allowed items-center gap-3 bg-lima/20 px-4 py-2 text-left text-sm text-floresta opacity-60 ring-1 ring-inset ring-floresta transition-colors',
  texto: 'flex min-w-0 flex-1 flex-col',
  rotulo: 'truncate text-sm text-grafite',
  rotuloSelecionado: 'truncate text-sm text-floresta',
  descricao: 'text-xs text-floresta/70',
  direita: 'shrink-0 text-sm text-grafite',
  blocoEstado: 'p-2',
} as const

/** Lista selecionável com navegação por setas e estados de erro/vazio/carregando. */
export class ListaSelecionavel<T> extends Componente {
  private readonly aoSelecionar: ((item: T, indice: number) => void) | undefined
  private readonly aoTentar: (() => void) | undefined
  private readonly tituloVazio: string
  private readonly mensagemVazia: string
  private readonly acaoVazio: OpcoesBotao | undefined
  private readonly mensagemCarregando: string
  private opcoes: readonly OpcaoListaSelecionavel<T>[]
  private botoes: readonly HTMLButtonElement[] = []
  private indiceSelecionado: number | null = null
  private carregando: boolean
  private erro: string | null

  constructor(opcoes: OpcoesListaSelecionavel<T>) {
    super(
      criarElemento('div', {
        className: CLASSES.container,
        atributos: {
          id: opcoes.id,
          role: 'listbox',
          'aria-label': opcoes.rotulo,
        },
      }),
    )

    this.aoSelecionar = opcoes.aoSelecionar
    this.aoTentar = opcoes.aoTentar
    this.tituloVazio = opcoes.tituloVazio ?? 'Nenhuma opção disponível'
    this.mensagemVazia = opcoes.mensagemVazia ?? 'Não há itens para mostrar nesta lista.'
    this.acaoVazio = opcoes.acaoVazio
    this.mensagemCarregando = opcoes.mensagemCarregando ?? 'Carregando opções…'
    this.opcoes = opcoes.opcoes
    this.carregando = opcoes.carregando === true
    this.erro = opcoes.erro ?? null

    this.elemento.addEventListener('keydown', this.aoTeclado)
    this.renderizar()
  }

  definirOpcoes(opcoes: readonly OpcaoListaSelecionavel<T>[]): void {
    this.opcoes = opcoes
    this.renderizar()
  }

  definirCarregando(valor: boolean): void {
    this.carregando = valor
    this.renderizar()
  }

  definirErro(mensagem: string | null): void {
    this.erro = mensagem
    this.renderizar()
  }

  definirSelecionado(indice: number | null): void {
    this.indiceSelecionado = indice
    this.atualizarSelecaoVisual()
  }

  indiceSelecionadoAtual(): number | null {
    return this.indiceSelecionado
  }

  focarPrimeira(): void {
    const botao = this.botoes.find((_item, indice) => this.opcoes[indice]?.desabilitado !== true)
    botao?.focus()
  }

  private readonly aoTeclado = (evento: KeyboardEvent): void => {
    const passo = evento.key === 'ArrowDown' ? 1 : evento.key === 'ArrowUp' ? -1 : 0
    if (passo === 0 || this.botoes.length === 0) {
      return
    }

    const habilitados = this.botoes
      .map((_botao, indice) => indice)
      .filter((indice) => this.opcoes[indice]?.desabilitado !== true)
    if (habilitados.length === 0) {
      return
    }

    evento.preventDefault()
    const atual =
      document.activeElement instanceof HTMLButtonElement
        ? this.botoes.indexOf(document.activeElement)
        : -1

    if (atual === -1) {
      const destino = passo > 0 ? habilitados[0] : habilitados[habilitados.length - 1]
      this.botoes[destino]?.focus()
      return
    }

    const posicao = habilitados.indexOf(atual)
    if (posicao === -1) {
      this.botoes[habilitados[0]]?.focus()
      return
    }

    const proxima =
      habilitados[(posicao + passo + habilitados.length) % habilitados.length]
    this.botoes[proxima]?.focus()
  }

  private renderizar(): void {
    if (this.indiceSelecionado !== null && this.indiceSelecionado >= this.opcoes.length) {
      this.indiceSelecionado = null
    }

    this.elemento.replaceChildren()
    this.botoes = []

    if (this.carregando) {
      const area = criarElemento('div', { className: CLASSES.blocoEstado })
      new Carregando({
        variante: 'skeleton',
        linhas: 3,
        mensagem: this.mensagemCarregando,
      }).montar(area)
      this.elemento.append(area)
      return
    }

    if (this.erro !== null) {
      const area = criarElemento('div', { className: CLASSES.blocoEstado })
      new EstadoErro({
        mensagem: this.erro,
        aoTentar: () => {
          this.aoTentar?.()
        },
      }).montar(area)
      this.elemento.append(area)
      return
    }

    if (this.opcoes.length === 0) {
      const area = criarElemento('div', { className: CLASSES.blocoEstado })
      new EstadoVazio({
        titulo: this.tituloVazio,
        mensagem: this.mensagemVazia,
        ...(this.acaoVazio === undefined ? {} : { acao: this.acaoVazio }),
      }).montar(area)
      this.elemento.append(area)
      return
    }

    this.botoes = this.opcoes.map((opcao, indice) => this.criarBotao(opcao, indice))
    this.elemento.append(...this.botoes)
  }

  private criarBotao(
    opcao: OpcaoListaSelecionavel<T>,
    indice: number,
  ): HTMLButtonElement {
    const selecionado = opcao.selecionado === true || indice === this.indiceSelecionado
    const desabilitado = opcao.desabilitado === true
    const atributos: Record<string, string> = {
      type: 'button',
      role: 'option',
      'aria-selected': selecionado ? 'true' : 'false',
    }
    if (desabilitado) {
      atributos['aria-disabled'] = 'true'
    }

    const texto = criarElemento('span', {
      className: selecionado ? CLASSES.rotuloSelecionado : CLASSES.rotulo,
      atributos: { 'data-lista-rotulo': '' },
      texto: opcao.rotulo,
    })
    const blocoTexto = criarElemento('span', {
      className: CLASSES.texto,
      filhos:
        opcao.descricao === undefined
          ? [texto]
          : [texto, criarElemento('span', { className: CLASSES.descricao, texto: opcao.descricao })],
    })

    const filhos: Array<Node | string> = [blocoTexto]
    if (opcao.conteudoDireita !== undefined) {
      filhos.push(
        criarElemento('span', {
          className: CLASSES.direita,
          filhos: [opcao.conteudoDireita],
        }),
      )
    }

    const botao = criarElemento('button', {
      className: this.classePara(selecionado, desabilitado),
      atributos,
      filhos,
    })
    botao.disabled = desabilitado
    botao.addEventListener('click', () => {
      if (desabilitado) {
        return
      }
      this.definirSelecionado(indice)
      this.aoSelecionar?.(opcao.item, indice)
    })
    return botao
  }

  private atualizarSelecaoVisual(): void {
    this.botoes.forEach((botao, indice) => {
      const selecionado = indice === this.indiceSelecionado
      const desabilitado = this.opcoes[indice]?.desabilitado === true
      botao.className = this.classePara(selecionado, desabilitado)
      botao.setAttribute('aria-selected', selecionado ? 'true' : 'false')
      const rotulo = botao.querySelector<HTMLElement>('[data-lista-rotulo]')
      if (rotulo !== null) {
        rotulo.className = selecionado ? CLASSES.rotuloSelecionado : CLASSES.rotulo
      }
    })
  }

  private classePara(selecionado: boolean, desabilitado: boolean): string {
    if (selecionado) {
      return desabilitado ? CLASSES.opcaoSelecionadaDesabilitada : CLASSES.opcaoSelecionada
    }
    return desabilitado ? CLASSES.opcaoDesabilitada : CLASSES.opcao
  }
}
