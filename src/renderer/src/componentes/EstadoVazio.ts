import { Botao } from './Botao'
import type { OpcoesBotao } from './Botao'
import { Componente, criarElemento, criarIcone } from '../nucleo'

export interface OpcoesEstadoVazio {
  readonly titulo: string
  readonly mensagem: string
  readonly icone?: string
  readonly acao?: OpcoesBotao
}

const CLASSES = {
  container:
    'flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-granito/60 bg-pedra/40 p-8 text-center',
  icone: 'size-10 text-floresta/70',
  titulo: 'font-display text-lg text-floresta',
  texto: 'max-w-sm text-sm text-floresta/70',
} as const

const ICONE_PADRAO = 'M20 7l-8-4-8 4v10l8 4 8-4zM4 7l8 4 8-4M12 11v10'

export class EstadoVazio extends Componente {
  constructor(opcoes: OpcoesEstadoVazio) {
    const filhos: Array<Node | string> = [
      criarIcone(opcoes.icone ?? ICONE_PADRAO, CLASSES.icone),
      criarElemento('h3', { className: CLASSES.titulo, texto: opcoes.titulo }),
      criarElemento('p', { className: CLASSES.texto, texto: opcoes.mensagem }),
    ]

    if (opcoes.acao !== undefined) {
      filhos.push(new Botao({ ...opcoes.acao, variante: 'secundario' }).raiz)
    }

    super(
      criarElemento('div', {
        className: CLASSES.container,
        filhos,
      }),
    )
  }
}
