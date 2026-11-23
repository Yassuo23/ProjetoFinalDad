import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  cabecalho:
    'flex items-center justify-between gap-4 border-b border-granito/30 bg-superficie px-6 py-4',
  titulo: 'font-display text-xl text-floresta',
  direita: 'flex items-center gap-3',
  perfil: 'rounded-pill bg-pedra px-2.5 py-1 text-xs font-semibold text-floresta',
  dica: 'text-xs text-floresta/70',
} as const

export class Cabecalho extends Componente {
  private readonly titulo: HTMLHeadingElement

  constructor(tituloInicial = 'Dashboard') {
    const titulo = criarElemento('h1', {
      className: CLASSES.titulo,
      texto: tituloInicial,
    })

    const direita = criarElemento('div', {
      className: CLASSES.direita,
      filhos: [
        criarElemento('span', {
          className: CLASSES.dica,
          texto: 'Ctrl+K busca · Ctrl+N novo',
        }),
        criarElemento('span', {
          className: CLASSES.perfil,
          texto: 'Atendente de balcão',
        }),
      ],
    })

    super(
      criarElemento('header', {
        className: CLASSES.cabecalho,
        atributos: { 'aria-label': 'Cabeçalho da aplicação' },
        filhos: [titulo, direita],
      }),
    )
    this.titulo = titulo
  }

  definirTitulo(texto: string): void {
    this.titulo.textContent = texto
  }
}
