import { Componente, criarElemento } from '../nucleo'

export type VarianteCarregando = 'spinner' | 'skeleton'

export interface OpcoesCarregando {
  readonly mensagem?: string
  readonly variante?: VarianteCarregando
  readonly linhas?: number
  readonly desabilitado?: boolean
}

/** Classes literais por estado (DS 8.11) — sem concatenação. */
const CLASSES = {
  container: 'flex min-h-40 items-center justify-center gap-3 text-floresta',
  containerDesabilitado: 'flex min-h-40 items-center justify-center gap-3 text-floresta opacity-60',
  spinner: 'size-5 animate-spin motion-reduce:animate-none rounded-full border-2 border-granito/40 border-t-floresta',
  texto: 'text-sm text-floresta/70',
  srOnly: 'sr-only',
  skeletonContainer: 'flex min-h-40 flex-col justify-center gap-3',
  skeletonContainerDesabilitado: 'flex min-h-40 flex-col justify-center gap-3 opacity-60',
  skeletonGrupo: 'flex flex-col gap-3',
  skeletonTitulo: 'h-5 w-2/5 animate-pulse motion-reduce:animate-none rounded-control bg-granito/30',
  skeletonLinha: 'h-4 w-full animate-pulse motion-reduce:animate-none rounded-control bg-granito/30',
} as const

export class Carregando extends Componente {
  private readonly texto: HTMLParagraphElement

  constructor(opcoes: OpcoesCarregando = {}) {
    const mensagem = opcoes.mensagem ?? 'Carregando…'
    const texto = criarElemento('p', {
      className: CLASSES.texto,
      texto: mensagem,
      atributos: { 'aria-live': 'polite' },
    })
    const desabilitado = opcoes.desabilitado === true

    let raiz: HTMLElement
    if (opcoes.variante === 'skeleton') {
      texto.className = CLASSES.srOnly
      const grupo = criarElemento('div', {
        className: CLASSES.skeletonGrupo,
        atributos: { 'aria-hidden': 'true' },
      })
      grupo.append(
        criarElemento('span', { className: CLASSES.skeletonTitulo }),
        ...Array.from(
          { length: Math.max(1, opcoes.linhas ?? 3) },
          () => criarElemento('span', { className: CLASSES.skeletonLinha }) as Node,
        ),
      )
      raiz = criarElemento('div', {
        className: desabilitado ? CLASSES.skeletonContainerDesabilitado : CLASSES.skeletonContainer,
        filhos: [grupo, texto],
      })
    } else {
      const spinner = criarElemento('span', {
        className: CLASSES.spinner,
        atributos: { 'aria-hidden': 'true' },
      })
      raiz = criarElemento('div', {
        className: desabilitado ? CLASSES.containerDesabilitado : CLASSES.container,
        filhos: [spinner, texto],
      })
    }

    super(raiz)
    this.texto = texto
  }

  definirMensagem(mensagem: string): void {
    this.texto.textContent = mensagem
  }
}
