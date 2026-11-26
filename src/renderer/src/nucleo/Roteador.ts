import type { Componente } from './Componente'

export type FabricaPagina = () => Componente
/** Guarda síncrono: devolve a rota efetiva antes de montar qualquer página. */
export type GuardiaoRota = (caminho: string) => string

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
    private readonly guardiao?: GuardiaoRota,
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

  private caminhoSolicitado(): string {
    const bruto = window.location.hash.replace(/^#/, '')
    const caminho = bruto.startsWith('/') ? bruto : `/${bruto}`
    if (caminho === '/' || caminho === '') {
      return ROTA_INICIAL
    }
    return this.rotas.has(caminho) ? caminho : ROTA_404
  }

  private processar(): void {
    const solicitado = this.caminhoSolicitado()
    const permitido = this.guardiao?.(solicitado) ?? solicitado

    // Redirecionamento do guard: troca o hash e deixa o próximo evento montar.
    // Assim a página protegida nunca chega a ser instanciada sem sessão.
    if (permitido !== solicitado) {
      window.location.hash = `#${permitido}`
      return
    }

    const fabrica = this.rotas.get(permitido)
    if (!fabrica) {
      throw new Error(`Rota ${permitido} sem fábrica registrada`)
    }

    this.atual?.destruir()
    this.atual = fabrica()
    this.atual.montar(this.destino)
    this.aoNavegar?.(permitido)
  }
}
