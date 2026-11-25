import { Botao } from './Botao'
import type { OpcoesBotao } from './Botao'
import { Componente, criarElemento, criarIcone, criarIlustracao } from '../nucleo'

/** Ilustrações originais descritas em docs/ux-fluxos.md §9.5. */
export type IlustracaoVazia = 'reservas' | 'equipamentos' | 'categorias' | 'manutencao' | 'pessoas'

export interface OpcoesEstadoVazio {
  readonly titulo: string
  readonly mensagem: string
  readonly icone?: string
  readonly ilustracao?: IlustracaoVazia
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

/** Cada arranjo é um desenho autoral em traço 1,5 px, sem preenchimento. */
const ILUSTRACOES: Readonly<Record<IlustracaoVazia, readonly string[]>> = {
  // Caixa de equipamento vista de frente, com alça superior e duas fivelas laterais.
  reservas: [
    'M4 9h16v11H4z',
    'M4 9l2-4h12l2 4',
    'M9 5V3h6v2',
    'M2 12h3M19 12h3',
    'M3.5 10.5v3M20.5 10.5v3',
  ],
  // Mapa dobrado em três dobras com um pino circular no centro.
  equipamentos: [
    'M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z',
    'M9 4v14M15 6v14',
    'M12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
    'M12 11v3',
  ],
  // Caixa de equipamento com uma etiqueta vazia pendurada.
  categorias: ['M4 11h16v9H4z', 'M4 11l2-4h12l2 4', 'M9 11V7h7l3 2-3 2H9', 'M11 8h.01'],
  // Prancheta com uma chave de grifo cruzada sobre a folha.
  manutencao: ['M6 4h12v16H6z', 'M9 4V2h6v2', 'M8 17l9-9', 'M15 6l3 3', 'M18 6l-3 3'],
  // Etiqueta de identificação com linha de texto e um círculo de fundo no canto.
  pessoas: [
    'M4 5h13l3 3v11H4z',
    'M7 9h6M7 12h5',
    'M16 15a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  ],
}

export class EstadoVazio extends Componente {
  constructor(opcoes: OpcoesEstadoVazio) {
    const arte =
      opcoes.ilustracao === undefined
        ? criarIcone(opcoes.icone ?? ICONE_PADRAO, CLASSES.icone)
        : criarIlustracao(ILUSTRACOES[opcoes.ilustracao], CLASSES.icone)

    const filhos: Array<Node | string> = [
      arte,
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
