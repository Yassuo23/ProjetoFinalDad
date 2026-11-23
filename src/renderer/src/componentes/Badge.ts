import { Componente, criarElemento, criarIcone } from '../nucleo'

export type TomBadge = 'sucesso' | 'alerta' | 'erro' | 'neutro' | 'escuro'

export interface OpcoesBadge {
  readonly texto: string
  readonly tom?: TomBadge
  readonly desabilitado?: boolean
  /** Caminho do ícone SVG decorativo. */
  readonly icone?: string
}

/** Tons normais e desabilitados como strings completas (DS 8.6). */
const CLASSES: Readonly<Record<TomBadge, string>> = {
  sucesso:
    'inline-flex items-center gap-1.5 rounded-pill bg-sucesso-suave px-2.5 py-1 text-xs font-semibold text-sucesso',
  alerta:
    'inline-flex items-center gap-1.5 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
  erro: 'inline-flex items-center gap-1.5 rounded-pill bg-erro-suave px-2.5 py-1 text-xs font-semibold text-erro',
  neutro:
    'inline-flex items-center gap-1.5 rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta',
  escuro:
    'inline-flex items-center gap-1.5 rounded-pill bg-lima/20 px-2.5 py-1 text-xs font-semibold text-lima',
}

const CLASSES_DESABILITADAS: Readonly<Record<TomBadge, string>> = {
  sucesso:
    'inline-flex items-center gap-1.5 rounded-pill bg-sucesso-suave px-2.5 py-1 text-xs font-semibold text-sucesso opacity-50',
  alerta:
    'inline-flex items-center gap-1.5 rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta opacity-50',
  erro: 'inline-flex items-center gap-1.5 rounded-pill bg-erro-suave px-2.5 py-1 text-xs font-semibold text-erro opacity-50',
  neutro:
    'inline-flex items-center gap-1.5 rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta opacity-50',
  escuro:
    'inline-flex items-center gap-1.5 rounded-pill bg-lima/20 px-2.5 py-1 text-xs font-semibold text-lima opacity-50',
}

export class Badge extends Componente {
  private readonly elementoBadge: HTMLSpanElement
  private tom: TomBadge
  private desabilitado: boolean

  constructor(opcoes: OpcoesBadge) {
    const tom = opcoes.tom ?? 'neutro'
    const desabilitado = opcoes.desabilitado === true
    const filhos: Array<Node | string> = []
    if (opcoes.icone !== undefined) {
      filhos.push(criarIcone(opcoes.icone))
    }
    filhos.push(opcoes.texto)

    const badge = criarElemento('span', {
      className: desabilitado ? CLASSES_DESABILITADAS[tom] : CLASSES[tom],
      filhos,
    })

    super(badge)
    this.elementoBadge = badge
    this.tom = tom
    this.desabilitado = desabilitado
  }

  definirTom(tom: TomBadge): void {
    this.tom = tom
    this.aplicarClasses()
  }

  definirDesabilitado(valor: boolean): void {
    this.desabilitado = valor
    this.aplicarClasses()
  }

  private aplicarClasses(): void {
    this.elementoBadge.className = this.desabilitado
      ? CLASSES_DESABILITADAS[this.tom]
      : CLASSES[this.tom]
  }
}
