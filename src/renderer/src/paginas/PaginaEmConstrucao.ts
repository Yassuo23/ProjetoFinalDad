import { Componente, criarElemento, criarIcone } from '../nucleo'

const CLASSES = {
  pagina: 'flex max-w-2xl flex-col gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  vazio:
    'flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-granito/60 bg-pedra/40 p-8 text-center',
  icone: 'size-10 text-floresta/70',
  mensagem: 'max-w-sm text-sm text-floresta/70',
  badge: 'inline-flex rounded-pill bg-alerta-suave px-2.5 py-1 text-xs font-semibold text-alerta',
} as const

const ICONE = 'M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'

/**
 * Placeholder honesto para rotas do mapa que ainda não têm contrato IPC.
 * Cada rota recebe sua própria instância, com título e dependências.
 */
export class PaginaEmConstrucao extends Componente {
  constructor(titulo: string, dependencia: string) {
    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [
          criarElemento('div', {
            filhos: [
              criarElemento('h2', { className: CLASSES.titulo, texto: titulo }),
              criarElemento('p', {
                className: CLASSES.subtitulo,
                texto: 'Telas planejadas em docs/telas.md.',
              }),
            ],
          }),
          criarElemento('div', {
            className: CLASSES.vazio,
            filhos: [
              criarIcone(ICONE, CLASSES.icone),
              criarElemento('p', {
                className: CLASSES.mensagem,
                texto: 'Esta tela depende de canais que ainda não existem no contrato IPC.',
              }),
              criarElemento('span', { className: CLASSES.badge, texto: dependencia }),
            ],
          }),
        ],
      }),
    )
  }
}
