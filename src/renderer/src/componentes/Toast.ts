import { Componente, criarElemento, criarIcone } from '../nucleo'

export type TomToast = 'sucesso' | 'erro' | 'alerta' | 'informacao'

export interface OpcoesToast {
  readonly mensagem: string
  readonly titulo?: string
  readonly tom?: TomToast
  /** 0 desliga o fechamento automático. Padrão: 5000 ms. */
  readonly duracaoMs?: number
  readonly aoFechar?: () => void
}

const CLASSES = {
  area: 'fixed bottom-6 right-6 z-50 flex w-[min(92vw,360px)] flex-col gap-2',
  slot: 'contents',
  sucesso:
    'flex items-start gap-3 rounded-card border border-sucesso/30 bg-sucesso-suave px-4 py-3 text-sm text-sucesso shadow-card',
  erro: 'flex items-start gap-3 rounded-card border border-erro/30 bg-erro-suave px-4 py-3 text-sm text-erro shadow-card',
  alerta:
    'flex items-start gap-3 rounded-card border border-alerta/30 bg-alerta-suave px-4 py-3 text-sm text-alerta shadow-card',
  informacao:
    'flex items-start gap-3 rounded-card border border-geleira/40 bg-geleira/10 px-4 py-3 text-sm text-floresta shadow-card',
  conteudo: 'flex min-w-0 flex-1 flex-col gap-0.5',
  titulo: 'font-semibold',
  fechar:
    'ml-auto inline-flex size-6 items-center justify-center rounded-control text-floresta transition-colors motion-reduce:transition-none hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
} as const

const ICONES: Readonly<Record<TomToast, string>> = {
  sucesso: 'M5 13l4 4L19 7',
  erro: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v6M12 16h.01',
  alerta: 'M12 3L2 20h20L12 3zM12 9v5M12 17h.01',
  informacao: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 11v6M12 7h.01',
}

const FECHAR = 'M6 6l12 12M18 6L6 18'

export class Toast extends Componente {
  private readonly aoFechar: (() => void) | undefined
  private readonly timer: number | null
  private fechado = false

  constructor(opcoes: OpcoesToast) {
    const tom = opcoes.tom ?? 'informacao'
    const conteudo = criarElemento('div', {
      className: CLASSES.conteudo,
      filhos: [
        ...(opcoes.titulo === undefined
          ? []
          : [criarElemento('span', { className: CLASSES.titulo, texto: opcoes.titulo })]),
        criarElemento('span', { texto: opcoes.mensagem }),
      ],
    })

    const fechar = criarElemento('button', {
      className: CLASSES.fechar,
      atributos: { type: 'button', 'aria-label': 'Fechar notificação' },
    })
    fechar.append(criarIcone(FECHAR))

    super(
      criarElemento('div', {
        className: CLASSES[tom],
        atributos: {
          role: tom === 'erro' ? 'alert' : 'status',
          'aria-live': tom === 'erro' ? 'assertive' : 'polite',
        },
        filhos: [criarIcone(ICONES[tom]), conteudo, fechar],
      }),
    )

    this.aoFechar = opcoes.aoFechar
    fechar.addEventListener('click', () => {
      this.fechar()
    })

    const duracao = opcoes.duracaoMs ?? 5000
    this.timer = duracao > 0 ? window.setTimeout(() => this.fechar(), duracao) : null
  }

  fechar(): void {
    if (this.fechado) {
      return
    }
    this.fechado = true
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
    }
    this.aoFechar?.()
    this.destruir()
  }

  protected aoDesmontar(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer)
    }
  }
}

/** Container fixo que empilha toasts sem sobrepor a área de conteúdo. */
export class AreaToast extends Componente {
  private readonly toasts = new Set<Toast>()

  constructor() {
    super(criarElemento('div', { className: CLASSES.area }))
  }

  exibir(opcoes: OpcoesToast): Toast {
    const slot = criarElemento('div', { className: CLASSES.slot })
    this.raiz.append(slot)
    const toast = new Toast({
      ...opcoes,
      aoFechar: () => {
        this.toasts.delete(toast)
        slot.remove()
        opcoes.aoFechar?.()
      },
    })
    this.toasts.add(toast)
    toast.montar(slot)
    return toast
  }

  limpar(): void {
    for (const toast of [...this.toasts]) {
      toast.fechar()
    }
  }
}
