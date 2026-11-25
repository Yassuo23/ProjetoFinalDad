import { Componente, criarElemento } from '../nucleo'
import { Badge } from './Badge'
import { Carregando } from './Carregando'

export interface OpcoesPainelFormulario {
  readonly id: string
  readonly titulo: string
  readonly corpo: Node
  readonly rodape?: readonly Node[]
  readonly acoesCabecalho?: readonly Node[]
  readonly erro?: boolean
  readonly carregando?: boolean
  readonly desabilitado?: boolean
  readonly selecionado?: boolean
  readonly mensagemCarregando?: string
}

/** DS 8.14 — classes literais, sem concatenação (Tailwind v4). */
const CLASSES = {
  painel:
    'flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-granito/45 bg-superficie shadow-card focus-within:ring-1 focus-within:ring-inset focus-within:ring-floresta',
  painelErro:
    'flex h-full min-h-0 flex-col overflow-hidden rounded-card border border-granito/45 bg-superficie shadow-card ring-1 ring-erro focus-within:ring-1 focus-within:ring-inset focus-within:ring-floresta',
  cabecalho: 'flex items-center justify-between gap-3 border-b border-granito/30 px-5 py-4',
  titulo: 'font-display text-base text-floresta',
  tituloErro: 'font-display text-base text-erro',
  direita: 'flex items-center justify-end gap-3',
  seloSlot: 'flex items-center gap-2',
  acoes: 'flex items-center gap-2',
  corpo: 'min-h-0 flex-1 overflow-y-auto px-5 py-4',
  corpoCarregando: 'min-h-0 flex-1 overflow-y-auto px-5 py-4 opacity-60',
  rodape: 'flex items-center justify-end gap-3 border-t border-granito/30 px-5 py-4',
  rodapeDesabilitado:
    'flex items-center justify-end gap-3 border-t border-granito/30 px-5 py-4 pointer-events-none opacity-60',
} as const

const SELETOR_CONTROLES =
  'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'

/** Painel de formulário dos CRUDs, com estados de erro/carregamento/seleção. */
export class PainelFormulario extends Componente {
  private readonly titulo: HTMLHeadingElement
  private readonly corpo: HTMLDivElement
  private readonly rodape: HTMLDivElement
  private readonly seloSlot: HTMLDivElement
  private conteudo: Node
  private erro: boolean
  private carregando: boolean
  private desabilitado: boolean
  private selecionado: boolean
  private readonly mensagemCarregando: string

  constructor(opcoes: OpcoesPainelFormulario) {
    const titulo = criarElemento('h2', {
      className: CLASSES.titulo,
      texto: opcoes.titulo,
      atributos: { id: `${opcoes.id}-titulo` },
    })
    const seloSlot = criarElemento('div', { className: CLASSES.seloSlot })
    const acoes = criarElemento('div', {
      className: CLASSES.acoes,
      filhos: [...(opcoes.acoesCabecalho ?? [])],
    })
    const cabecalho = criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [titulo, criarElemento('div', { className: CLASSES.direita, filhos: [seloSlot, acoes] })],
    })
    const corpo = criarElemento('div', { className: CLASSES.corpo })
    const rodape = criarElemento('div', {
      className: CLASSES.rodape,
      filhos: [...(opcoes.rodape ?? [])],
    })

    super(
      criarElemento('section', {
        className: CLASSES.painel,
        atributos: { 'aria-labelledby': `${opcoes.id}-titulo` },
        filhos: [cabecalho, corpo, rodape],
      }),
    )

    this.titulo = titulo
    this.corpo = corpo
    this.rodape = rodape
    this.seloSlot = seloSlot
    this.conteudo = opcoes.corpo
    this.erro = opcoes.erro === true
    this.carregando = opcoes.carregando === true
    this.desabilitado = opcoes.desabilitado === true
    this.selecionado = opcoes.selecionado === true
    this.mensagemCarregando = opcoes.mensagemCarregando ?? 'Carregando formulário…'

    this.aplicarClasses()
    this.renderizarSelo()
    this.renderizarCorpo()
  }

  definirTitulo(texto: string): void {
    this.titulo.textContent = texto
  }

  definirCorpo(conteudo: Node): void {
    this.conteudo = conteudo
    this.renderizarCorpo()
  }

  definirErro(valor: boolean): void {
    this.erro = valor
    this.aplicarClasses()
  }

  definirCarregando(valor: boolean): void {
    this.carregando = valor
    this.aplicarClasses()
    this.renderizarCorpo()
  }

  definirDesabilitado(valor: boolean): void {
    this.desabilitado = valor
    this.aplicarClasses()
  }

  definirSelecionado(valor: boolean): void {
    this.selecionado = valor
    this.renderizarSelo()
  }

  focarPrimeiroControle(): void {
    const controle = this.elemento.querySelector<HTMLElement>(SELETOR_CONTROLES)
    controle?.focus()
  }

  private aplicarClasses(): void {
    this.elemento.className = this.erro ? CLASSES.painelErro : CLASSES.painel
    this.titulo.className = this.erro ? CLASSES.tituloErro : CLASSES.titulo
    this.rodape.className = this.desabilitado ? CLASSES.rodapeDesabilitado : CLASSES.rodape
    this.elemento.setAttribute('aria-busy', this.carregando ? 'true' : 'false')
    this.rodape.setAttribute('aria-disabled', this.desabilitado ? 'true' : 'false')
  }

  private renderizarSelo(): void {
    this.seloSlot.replaceChildren()
    if (this.selecionado) {
      this.seloSlot.append(new Badge({ texto: 'Selecionado', tom: 'sucesso' }).raiz)
    }
  }

  private renderizarCorpo(): void {
    this.corpo.className = this.carregando ? CLASSES.corpoCarregando : CLASSES.corpo
    if (this.carregando) {
      this.corpo.replaceChildren(
        new Carregando({ mensagem: this.mensagemCarregando }).raiz,
      )
      return
    }
    this.corpo.replaceChildren(this.conteudo)
  }
}
