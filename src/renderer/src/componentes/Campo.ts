import { Componente, criarElemento, criarIcone } from '../nucleo'
import { criarAjuda, criarMensagemErro, criarRotulo, sincronizarDescricao } from './comum'

export interface OpcoesCampo {
  readonly id: string
  readonly rotulo: string
  readonly tipo?: 'text' | 'email' | 'tel' | 'password' | 'date' | 'number'
  readonly nome?: string
  readonly placeholder?: string
  readonly valorInicial?: string
  readonly ajuda?: string
  readonly erro?: string
  readonly obrigatorio?: boolean
  readonly desabilitado?: boolean
  readonly autocomplete?: string
  /** Caminho do ícone SVG decorativo à esquerda. */
  readonly icone?: string
  readonly aoAlterar?: (valor: string) => void
}

/** Base, erro e variantes com ícone: quatro strings literais (DS 8.2). */
const CLASSES = {
  campo:
    'w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 text-sm text-grafite placeholder:text-floresta/70 transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60',
  campoErro:
    'w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 text-sm text-grafite placeholder:text-floresta/70 transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60 aria-invalid:border-erro aria-invalid:focus-visible:outline-erro',
  campoComIcone:
    'w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 pl-9 text-sm text-grafite placeholder:text-floresta/70 transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60',
  campoErroComIcone:
    'w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 pl-9 text-sm text-grafite placeholder:text-floresta/70 transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60 aria-invalid:border-erro aria-invalid:focus-visible:outline-erro',
  relativo: 'relative',
  icone: 'pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-floresta',
  container: 'flex flex-col',
} as const

export class Campo extends Componente {
  private readonly input: HTMLInputElement
  private readonly ajuda: HTMLParagraphElement
  private readonly mensagemErro: HTMLParagraphElement
  private readonly comIcone: boolean

  constructor(opcoes: OpcoesCampo) {
    const atributos: Record<string, string> = { type: opcoes.tipo ?? 'text' }
    if (opcoes.nome !== undefined) {
      atributos.name = opcoes.nome
    }
    if (opcoes.placeholder !== undefined) {
      atributos.placeholder = opcoes.placeholder
    }
    if (opcoes.autocomplete !== undefined) {
      atributos.autocomplete = opcoes.autocomplete
    }
    if (opcoes.obrigatorio === true) {
      atributos.required = ''
      atributos['aria-required'] = 'true'
    }
    if (opcoes.desabilitado === true) {
      atributos.disabled = ''
    }

    const comIcone = opcoes.icone !== undefined
    const input = criarElemento('input', {
      className:
        opcoes.erro === undefined
          ? comIcone
            ? CLASSES.campoComIcone
            : CLASSES.campo
          : comIcone
            ? CLASSES.campoErroComIcone
            : CLASSES.campoErro,
      atributos,
    })
    input.id = opcoes.id
    if (opcoes.valorInicial !== undefined) {
      input.value = opcoes.valorInicial
    }

    const ajuda = criarAjuda(`${opcoes.id}-ajuda`, opcoes.ajuda)
    const mensagemErro = criarMensagemErro(`${opcoes.id}-erro`)
    mensagemErro.textContent = opcoes.erro ?? ''
    mensagemErro.hidden = opcoes.erro === undefined
    sincronizarDescricao(input, ajuda, mensagemErro)

    const wrapper = criarElemento('div', {
      filhos: comIcone ? [criarIcone(opcoes.icone ?? '', CLASSES.icone), input] : [input],
    })
    if (comIcone) {
      wrapper.className = CLASSES.relativo
    }

    const raiz = criarElemento('div', {
      className: CLASSES.container,
      filhos: [
        criarRotulo(opcoes.id, opcoes.rotulo, opcoes.obrigatorio === true),
        wrapper,
        ajuda,
        mensagemErro,
      ],
    })

    super(raiz)
    this.input = input
    this.ajuda = ajuda
    this.mensagemErro = mensagemErro
    this.comIcone = comIcone
    if (opcoes.aoAlterar !== undefined) {
      input.addEventListener('input', () => {
        opcoes.aoAlterar?.(input.value)
      })
    }
  }

  valor(): string {
    return this.input.value
  }

  definirValor(valor: string): void {
    this.input.value = valor
  }

  definirErro(mensagem: string | null): void {
    this.mensagemErro.textContent = mensagem ?? ''
    this.mensagemErro.hidden = mensagem === null
    this.input.className =
      mensagem === null
        ? this.comIcone
          ? CLASSES.campoComIcone
          : CLASSES.campo
        : this.comIcone
          ? CLASSES.campoErroComIcone
          : CLASSES.campoErro
    sincronizarDescricao(this.input, this.ajuda, this.mensagemErro)
  }

  definirDesabilitado(valor: boolean): void {
    this.input.disabled = valor
  }

  focar(): void {
    this.input.focus()
  }
}
