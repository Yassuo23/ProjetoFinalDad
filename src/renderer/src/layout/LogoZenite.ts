import { Componente, criarElemento } from '../nucleo'

const NS_SVG = 'http://www.w3.org/2000/svg'

/** Classes literais — o scanner do Tailwind v4 precisa vê-las por extenso. */
const CLASSES = {
  agrupamento: 'flex items-center gap-3',
  simbolo: 'size-8 shrink-0 text-lima',
  nomeColapsado: 'hidden font-display text-xl text-lima lg:inline',
} as const

function criarTraco(nome: string, atributos: Readonly<Record<string, string>>): SVGElement {
  const elemento = document.createElementNS(NS_SVG, nome)
  for (const [chave, valor] of Object.entries(atributos)) {
    elemento.setAttribute(chave, valor)
  }
  return elemento
}

/**
 * Marca vetorial do Zênite: sol no zênite sobre a linha de montanhas e o
 * horizonte. Sem fundo, sem imagem e sem `innerHTML` — apenas SVG tipado.
 */
export class LogoZenite extends Componente {
  constructor() {
    const simbolo = criarTraco('svg', {
      viewBox: '0 0 48 48',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-width': '2.5',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
      class: CLASSES.simbolo,
    })

    simbolo.append(
      criarTraco('circle', {
        cx: '24',
        cy: '11',
        r: '5',
        fill: 'currentColor',
        stroke: 'none',
      }),
      criarTraco('path', {
        d: 'M3 38 L16 19 L24 29 L31 20 L45 38',
      }),
      criarTraco('path', {
        d: 'M16 19 L19 24 L17 27',
      }),
      criarTraco('path', {
        d: 'M5 42 H43',
      }),
    )

    super(
      criarElemento('div', {
        className: CLASSES.agrupamento,
        atributos: { 'aria-label': 'Zênite — Aluguel Outdoor' },
        filhos: [
          simbolo,
          criarElemento('span', { className: CLASSES.nomeColapsado, texto: 'Zênite' }),
        ],
      }),
    )
  }
}
