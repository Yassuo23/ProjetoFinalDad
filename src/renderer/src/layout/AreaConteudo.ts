import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  area: 'flex-1 overflow-y-auto bg-pedra p-6',
} as const

/** Destino onde o roteador monta a página ativa. */
export class AreaConteudo extends Componente {
  constructor() {
    super(
      criarElemento('main', {
        className: CLASSES.area,
        atributos: { id: 'conteudo', tabIndex: '-1' },
      }),
    )
  }
}
