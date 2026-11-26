import { Botao } from '../componentes'
import { LogoZenite } from '../layout/LogoZenite'
import { Componente, criarElemento, criarIcone, ehCliente } from '../nucleo'

/** Tela genérica de rota sem permissão — a autoridade continua sendo o main. */
const CLASSES = {
  pagina: 'flex min-h-full items-center justify-center bg-pedra px-4 py-8 sm:px-6',
  cartao:
    'flex w-full max-w-lg flex-col items-center gap-5 rounded-card border border-granito/45 bg-superficie px-6 py-10 text-center shadow-card sm:px-10',
  titulo: 'font-display text-2xl text-floresta',
  mensagem: 'max-w-sm text-sm text-floresta/70',
  icone: 'size-10 text-alerta',
} as const

const ICONE_CADEADO = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'

export class PaginaAcessoRestrito extends Componente {
  constructor() {
    const cliente = ehCliente()
    const destino = cliente ? '#/cliente/disponibilidade' : '#/dashboard'

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [
          criarElemento('div', {
            className: CLASSES.cartao,
            filhos: [
              new LogoZenite({ variante: 'completa', fundo: 'claro' }).raiz,
              criarIcone(ICONE_CADEADO, CLASSES.icone),
              criarElemento('h1', { className: CLASSES.titulo, texto: 'Acesso restrito' }),
              criarElemento('p', {
                className: CLASSES.mensagem,
                texto:
                  'Você não tem permissão para abrir esta área. Fale com o administrador se precisar de acesso.',
              }),
              new Botao({
                texto: cliente ? 'Voltar para minha área' : 'Voltar ao Dashboard',
                aoClicar: () => {
                  window.location.hash = destino
                },
              }).raiz,
            ],
          }),
        ],
      }),
    )
  }
}
