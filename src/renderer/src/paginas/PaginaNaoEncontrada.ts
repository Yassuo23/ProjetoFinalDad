import { Componente, criarElemento, criarIcone } from '../nucleo'

const CLASSES = {
  pagina: 'flex max-w-2xl flex-col gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  vazio:
    'flex min-h-64 flex-col items-center justify-center gap-3 rounded-card border border-dashed border-granito/60 bg-pedra/40 p-8 text-center',
  icone: 'size-10 text-floresta/70',
  mensagem: 'max-w-sm text-sm text-floresta/70',
  botao:
    'cursor-pointer rounded-control border border-granito/45 bg-superficie px-4 py-2.5 text-sm font-semibold text-floresta transition-colors hover:bg-pedra focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
} as const

const ICONE = 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v6M12 16h.01'

export class PaginaNaoEncontrada extends Componente {
  constructor() {
    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [
          criarElemento('h2', { className: CLASSES.titulo, texto: 'Página não encontrada' }),
          criarElemento('div', {
            className: CLASSES.vazio,
            filhos: [
              criarIcone(ICONE, CLASSES.icone),
              criarElemento('p', {
                className: CLASSES.mensagem,
                texto: 'Este endereço não existe. Volte ao Dashboard para continuar.',
              }),
              criarElemento('a', {
                className: CLASSES.botao,
                atributos: { href: '#/dashboard' },
                texto: 'Voltar ao Dashboard',
              }),
            ],
          }),
        ],
      }),
    )
  }
}
