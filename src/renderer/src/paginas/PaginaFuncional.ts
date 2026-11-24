import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  conteudo: 'flex flex-col gap-6',
} as const

export type MontadorConteudo = (container: HTMLElement) => void

/**
 * Adaptador entre as telas funcionais (`montarX(container)`) e o contrato do
 * roteador (`FabricaPagina = () => Componente`). O conteúdo já está no DOM
 * quando `montarX` é chamado, preservando consultas e ouvintes da tela original.
 */
export class PaginaFuncional extends Componente {
  private readonly conteudo: HTMLElement
  private readonly montador: MontadorConteudo

  constructor(titulo: string, subtitulo: string, montar: MontadorConteudo) {
    const conteudo = criarElemento('div', { className: CLASSES.conteudo })
    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        atributos: { 'aria-label': titulo },
        filhos: [
          criarElemento('div', {
            className: CLASSES.cabecalho,
            filhos: [
              criarElemento('h2', { className: CLASSES.titulo, texto: titulo }),
              criarElemento('p', { className: CLASSES.subtitulo, texto: subtitulo }),
            ],
          }),
          conteudo,
        ],
      }),
    )
    this.conteudo = conteudo
    this.montador = montar
  }

  protected aoMontar(): void {
    this.montador(this.conteudo)
  }
}
