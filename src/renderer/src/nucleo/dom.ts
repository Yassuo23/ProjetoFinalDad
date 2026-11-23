/** Helpers de DOM seguro: nunca usar innerHTML no renderer. */

export interface OpcoesElemento {
  readonly className?: string
  readonly texto?: string
  readonly atributos?: Readonly<Record<string, string>>
  readonly filhos?: ReadonlyArray<Node | string>
}

function emNo(filho: Node | string): Node {
  return filho instanceof Node ? filho : document.createTextNode(filho)
}

export function criarElemento<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opcoes: OpcoesElemento = {},
): HTMLElementTagNameMap[K] {
  const elemento = document.createElement(tag)

  if (opcoes.className !== undefined) {
    elemento.className = opcoes.className
  }
  if (opcoes.texto !== undefined) {
    elemento.textContent = opcoes.texto
  }
  for (const [nome, valor] of Object.entries(opcoes.atributos ?? {})) {
    elemento.setAttribute(nome, valor)
  }
  for (const filho of opcoes.filhos ?? []) {
    elemento.append(emNo(filho))
  }

  return elemento
}

export function substituirConteudo(destino: Element, ...filhos: Array<Node | string>): void {
  destino.replaceChildren(...filhos.map(emNo))
}

const NS_SVG = 'http://www.w3.org/2000/svg'

/** Ícone inline com stroke-current; decorativo por padrão (aria-hidden). */
export function criarIcone(
  caminho: string,
  className = 'size-4 stroke-current shrink-0',
): SVGSVGElement {
  const svg = document.createElementNS(NS_SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '1.75')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', className)

  const traco = document.createElementNS(NS_SVG, 'path')
  traco.setAttribute('d', caminho)
  svg.append(traco)

  return svg
}
