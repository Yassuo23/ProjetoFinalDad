import { Componente, criarElemento, criarIcone } from '../nucleo'

export interface OpcoesModal {
  readonly id: string
  readonly titulo: string
  readonly conteudo: Node | string
  readonly rodape?: readonly Node[]
  readonly erro?: boolean
  readonly aoFechar?: () => void
}

const CLASSES = {
  backdrop: 'fixed inset-0 z-40 bg-grafite/60 backdrop-blur-sm',
  painel:
    'fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-card bg-superficie shadow-modal',
  painelErro:
    'fixed left-1/2 top-1/2 z-50 w-[min(92vw,560px)] -translate-x-1/2 -translate-y-1/2 rounded-card bg-superficie shadow-modal ring-1 ring-erro',
  cabecalho: 'flex items-center justify-between border-b border-granito/30 px-6 py-4',
  titulo: 'font-display text-xl text-floresta',
  tituloErro: 'font-display text-xl text-erro',
  fechar:
    'inline-flex size-8 items-center justify-center rounded-control text-floresta transition-colors hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  corpo: 'max-h-[60vh] overflow-y-auto px-6 py-5 text-sm text-grafite',
  rodape: 'flex justify-end gap-3 border-t border-granito/30 px-6 py-4',
} as const

const ICONE_FECHAR = 'M6 6l12 12M18 6L6 18'
const SELETOR_FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export class Modal extends Componente {
  private readonly painel: HTMLDivElement
  private readonly backdrop: HTMLDivElement
  private readonly aoFechar: (() => void) | undefined
  private anterior: HTMLElement | null = null

  constructor(opcoes: OpcoesModal) {
    const titulo = criarElemento('h2', {
      className: opcoes.erro === true ? CLASSES.tituloErro : CLASSES.titulo,
      atributos: { id: `${opcoes.id}-titulo` },
      texto: opcoes.titulo,
    })

    const fechar = criarElemento('button', {
      className: CLASSES.fechar,
      atributos: { type: 'button', 'aria-label': 'Fechar janela' },
    })
    fechar.append(criarIcone(ICONE_FECHAR))

    const corpo = criarElemento('div', {
      className: CLASSES.corpo,
      atributos: { id: `${opcoes.id}-conteudo` },
    })
    if (opcoes.conteudo instanceof Node) {
      corpo.append(opcoes.conteudo)
    } else {
      corpo.textContent = opcoes.conteudo
    }

    const filhosPainel = [
      criarElemento('div', {
        className: CLASSES.cabecalho,
        filhos: [titulo, fechar],
      }),
      corpo,
    ]
    if (opcoes.rodape !== undefined && opcoes.rodape.length > 0) {
      filhosPainel.push(
        criarElemento('div', { className: CLASSES.rodape, filhos: [...opcoes.rodape] }),
      )
    }

    const painel = criarElemento('div', {
      className: opcoes.erro === true ? CLASSES.painelErro : CLASSES.painel,
      atributos: {
        role: 'dialog',
        'aria-modal': 'true',
        'aria-labelledby': `${opcoes.id}-titulo`,
        'aria-describedby': `${opcoes.id}-conteudo`,
        tabindex: '-1',
      },
      filhos: filhosPainel,
    })

    const backdrop = criarElemento('div', {
      className: CLASSES.backdrop,
      filhos: [painel],
    })

    super(backdrop)
    this.painel = painel
    this.backdrop = backdrop
    this.aoFechar = opcoes.aoFechar
    fechar.addEventListener('click', () => {
      this.fechar()
    })
  }

  abrir(): void {
    this.montarFilho(document.body)
  }

  fechar(): void {
    this.destruir()
  }

  protected aoMontar(): void {
    this.anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
    document.addEventListener('keydown', this.aoTeclado)
    this.backdrop.addEventListener('click', this.aoCliqueFora)
    this.focarPrimeiro()
  }

  protected aoDesmontar(): void {
    document.removeEventListener('keydown', this.aoTeclado)
    this.backdrop.removeEventListener('click', this.aoCliqueFora)
    this.aoFechar?.()
    this.anterior?.focus()
    this.anterior = null
  }

  private readonly aoCliqueFora = (evento: MouseEvent): void => {
    if (evento.target === this.backdrop) {
      this.fechar()
    }
  }

  private readonly aoTeclado = (evento: KeyboardEvent): void => {
    if (evento.key === 'Escape') {
      evento.preventDefault()
      this.fechar()
      return
    }
    if (evento.key !== 'Tab') {
      return
    }

    const focusaveis = Array.from(
      this.painel.querySelectorAll<HTMLElement>(SELETOR_FOCAVEIS),
    ).filter((elemento) => elemento.getClientRects().length > 0)

    if (focusaveis.length === 0) {
      evento.preventDefault()
      this.painel.focus()
      return
    }

    const primeiro = focusaveis[0]
    const ultimo = focusaveis[focusaveis.length - 1]
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }

  private focarPrimeiro(): void {
    const primeiro = this.painel.querySelector<HTMLElement>(SELETOR_FOCAVEIS)
    if (primeiro !== null) {
      primeiro.focus()
    } else {
      this.painel.focus()
    }
  }
}
