import { Componente, criarElemento, criarIcone } from '../nucleo'
import { criarAjuda, criarMensagemErro, criarRotulo, sincronizarDescricao } from './comum'

export interface OpcaoSelect {
  readonly valor: string
  readonly rotulo: string
}

export interface OpcoesSelect {
  readonly id: string
  readonly rotulo: string
  readonly opcoes: readonly OpcaoSelect[]
  readonly valorInicial?: string
  readonly placeholder?: string
  readonly nome?: string
  readonly ajuda?: string
  readonly erro?: string
  readonly obrigatorio?: boolean
  readonly desabilitado?: boolean
  readonly aoAlterar?: (valor: string) => void
}

/** Mesma base de Campo, com appearance-none e espaço para a seta (DS 8.3). */
const CLASSES = {
  select:
    'w-full appearance-none rounded-control border border-granito/45 bg-superficie px-3 py-2 pr-9 text-sm text-grafite transition-colors motion-reduce:transition-none hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60',
  selectErro:
    'w-full appearance-none rounded-control border border-granito/45 bg-superficie px-3 py-2 pr-9 text-sm text-grafite transition-colors motion-reduce:transition-none hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60 aria-invalid:border-erro aria-invalid:focus-visible:outline-erro',
  relativo: 'relative',
  seta: 'pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-floresta',
  container: 'flex flex-col',
} as const

const SETA = 'm6 9 6 6 6-6'

export class Select extends Componente {
  private readonly select: HTMLSelectElement
  private readonly ajuda: HTMLParagraphElement
  private readonly mensagemErro: HTMLParagraphElement
  private readonly placeholder: string | undefined
  private opcoes: readonly OpcaoSelect[]

  constructor(opcoes: OpcoesSelect) {
    const atributos: Record<string, string> = {}
    if (opcoes.nome !== undefined) {
      atributos.name = opcoes.nome
    }
    if (opcoes.obrigatorio === true) {
      atributos.required = ''
      atributos['aria-required'] = 'true'
    }
    if (opcoes.desabilitado === true) {
      atributos.disabled = ''
    }

    const select = criarElemento('select', {
      className: opcoes.erro === undefined ? CLASSES.select : CLASSES.selectErro,
      atributos,
    })
    select.id = opcoes.id

    const valorInicial = opcoes.valorInicial ?? ''

    const ajuda = criarAjuda(`${opcoes.id}-ajuda`, opcoes.ajuda)
    const mensagemErro = criarMensagemErro(`${opcoes.id}-erro`)
    mensagemErro.textContent = opcoes.erro ?? ''
    mensagemErro.hidden = opcoes.erro === undefined
    sincronizarDescricao(select, ajuda, mensagemErro)

    const wrapper = criarElemento('div', {
      className: CLASSES.relativo,
      filhos: [select, criarIcone(SETA, CLASSES.seta)],
    })

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
    this.select = select
    this.ajuda = ajuda
    this.mensagemErro = mensagemErro
    this.placeholder = opcoes.placeholder
    this.opcoes = opcoes.opcoes
    this.preencher(valorInicial)
    if (opcoes.aoAlterar !== undefined) {
      select.addEventListener('change', () => {
        opcoes.aoAlterar?.(select.value)
      })
    }
  }

  valor(): string {
    return this.select.value
  }

  definirValor(valor: string): void {
    this.select.value = valor
  }

  definirOpcoes(opcoes: readonly OpcaoSelect[]): void {
    const atual = this.select.value
    this.opcoes = opcoes
    this.preencher(atual)
  }

  private preencher(valor: string): void {
    this.select.replaceChildren()
    if (this.placeholder !== undefined) {
      this.select.append(
        criarElemento('option', {
          texto: this.placeholder,
          atributos: { value: '', disabled: '' },
        }),
      )
    }
    for (const opcao of this.opcoes) {
      this.select.append(
        criarElemento('option', {
          texto: opcao.rotulo,
          atributos: { value: opcao.valor },
        }),
      )
    }
    this.select.value = this.opcoes.some((opcao) => opcao.valor === valor) ? valor : ''
  }

  definirErro(mensagem: string | null): void {
    this.mensagemErro.textContent = mensagem ?? ''
    this.mensagemErro.hidden = mensagem === null
    this.select.className = mensagem === null ? CLASSES.select : CLASSES.selectErro
    sincronizarDescricao(this.select, this.ajuda, this.mensagemErro)
  }

  definirDesabilitado(valor: boolean): void {
    this.select.disabled = valor
  }

  focar(): void {
    this.select.focus()
  }
}
