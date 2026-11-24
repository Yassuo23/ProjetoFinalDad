import type { Componente } from './Componente'

export type FabricaPagina = () => Componente

const ROTA_INICIAL = '/dashboard'
const ROTA_404 = '/404'

/** Roteador por hash: #/clientes → /clientes. Sem dependência de framework. */
export class Roteador {
  private atual: Componente | null = null
  private readonly aoHashChange = (): void => {
    this.processar()
  }

  constructor(
    private readonly destino: Element,
    private readonly rotas: ReadonlyMap<string, FabricaPagina>,
    private readonly aoNavegar?: (caminho: string) => void,
  ) {}

  iniciar(): void {
    window.addEventListener('hashchange', this.aoHashChange)
    this.processar()
  }

  parar(): void {
    window.removeEventListener('hashchange', this.aoHashChange)
    this.atual?.destruir()
    this.atual = null
  }

  navegar(caminho: string): void {
    window.location.hash = `#${caminho}`
  }

  private caminhoAtual(): string {
    const bruto = window.location.hash.replace(/^#/, '')
    const caminho = bruto.startsWith('/') ? bruto : `/${bruto}`
    if (caminho === '/' || caminho === '') {
      return ROTA_INICIAL
    }
    return this.rotas.has(caminho) ? caminho : ROTA_404
  }

  private processar(): void {
    const caminho = this.caminhoAtual()
    const fabrica = this.rotas.get(caminho)
    if (!fabrica) {
      throw new Error(`Rota ${caminho} sem fábrica registrada`)
    }

    this.atual?.destruir()
    this.atual = fabrica()
    this.atual.montar(this.destino)
    this.aoNavegar?.(caminho)
  }
}
