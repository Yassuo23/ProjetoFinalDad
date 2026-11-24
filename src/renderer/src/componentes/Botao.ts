import { Componente, criarElemento, criarIcone } from '../nucleo'

export type VarianteBotao = 'primario' | 'secundario' | 'ghost' | 'destrutivo'

export interface OpcoesBotao {
  readonly texto: string
  readonly variante?: VarianteBotao
  readonly tipo?: 'button' | 'submit' | 'reset'
  readonly desabilitado?: boolean
  /** Caminho do ícone SVG decorativo (aria-hidden). */
  readonly icone?: string
  /** Obrigatório quando não há texto visível (botão só com ícone). */
  readonly rotuloAcessivel?: string
  readonly id?: string
  readonly aoClicar?: () => void
}

/** Classes literais por variante — nenhuma interpolação (DS 8.1). */
const CLASSES: Readonly<Record<VarianteBotao, string>> = {
  primario:
    'inline-flex items-center justify-center gap-2 rounded-control bg-lima px-4 py-2.5 text-sm font-semibold text-grafite transition-colors duration-150 hover:bg-geleira focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-lima',
  secundario:
    'inline-flex items-center justify-center gap-2 rounded-control border border-granito/45 bg-superficie px-4 py-2.5 text-sm font-semibold text-floresta transition-colors duration-150 hover:bg-pedra focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-superficie',
  ghost:
    'inline-flex items-center justify-center gap-2 rounded-control bg-transparent px-4 py-2.5 text-sm font-semibold text-floresta transition-colors duration-150 hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
  destrutivo:
    'inline-flex items-center justify-center gap-2 rounded-control bg-erro px-4 py-2.5 text-sm font-semibold text-branco transition-colors duration-150 hover:bg-erro/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-erro',
}

export class Botao extends Componente {
  private readonly botao: HTMLButtonElement

  constructor(opcoes: OpcoesBotao) {
    const rotulo = opcoes.rotuloAcessivel ?? opcoes.texto
    if (!rotulo) {
      throw new Error('Botao sem texto visível exige rotuloAcessivel')
    }

    const filhos: Array<Node | string> = []
    if (opcoes.icone !== undefined) {
      filhos.push(criarIcone(opcoes.icone))
    }
    if (opcoes.texto.length > 0) {
      filhos.push(opcoes.texto)
    }

    const botao = criarElemento('button', {
      className: CLASSES[opcoes.variante ?? 'primario'],
      atributos: { type: opcoes.tipo ?? 'button' },
      filhos,
    })

    if (opcoes.texto.length === 0) {
      botao.setAttribute('aria-label', rotulo)
    }
    if (opcoes.id !== undefined) {
      botao.id = opcoes.id
    }
    if (opcoes.desabilitado === true) {
      botao.disabled = true
    }
    if (opcoes.aoClicar !== undefined) {
      botao.addEventListener('click', opcoes.aoClicar)
    }

    super(botao)
    this.botao = botao
  }

  definirDesabilitado(valor: boolean): void {
    this.botao.disabled = valor
  }

  focar(): void {
    this.botao.focus()
  }
}
