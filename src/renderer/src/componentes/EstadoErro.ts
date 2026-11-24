import { Componente, criarElemento, criarIcone } from '../nucleo'

export interface OpcoesEstadoErro {
  readonly mensagem: string
  readonly titulo?: string
  readonly detalhes?: string
  readonly rotuloAcao?: string
  readonly aoTentar: () => void
}

const CLASSES = {
  container:
    'flex min-h-40 flex-col items-center justify-center gap-3 rounded-card border border-erro/40 bg-erro-suave p-8 text-center',
  icone: 'size-9 text-erro',
  titulo: 'font-display text-lg text-erro',
  mensagem: 'max-w-md text-sm text-grafite',
  detalhes: 'mt-2 text-xs text-erro',
  botao:
    'inline-flex items-center justify-center gap-2 rounded-control border border-granito/45 bg-superficie px-4 py-2.5 text-sm font-semibold text-floresta transition-colors hover:bg-pedra focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro',
} as const

const ICONE = 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 7v6M12 16h.01'

export class EstadoErro extends Componente {
  constructor(opcoes: OpcoesEstadoErro) {
    const filhos: Array<Node | string> = [
      criarIcone(ICONE, CLASSES.icone),
      criarElemento('h3', {
        className: CLASSES.titulo,
        texto: opcoes.titulo ?? 'Não foi possível concluir',
      }),
      criarElemento('p', { className: CLASSES.mensagem, texto: opcoes.mensagem }),
    ]

    if (opcoes.detalhes !== undefined) {
      filhos.push(criarElemento('p', { className: CLASSES.detalhes, texto: opcoes.detalhes }))
    }

    const botao = criarElemento('button', {
      className: CLASSES.botao,
      atributos: { type: 'button' },
      texto: opcoes.rotuloAcao ?? 'Tentar de novo',
    })
    botao.addEventListener('click', opcoes.aoTentar)
    filhos.push(botao)

    super(
      criarElemento('div', {
        className: CLASSES.container,
        atributos: { role: 'alert' },
        filhos,
      }),
    )
  }
}
