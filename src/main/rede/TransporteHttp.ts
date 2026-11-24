import { ErroSemPermissao } from '../nucleo/erros'
import { urlExternaPermitida } from '../seguranca/UrlsExternas'

const TIMEOUT_PADRAO_MS = 8000

/** Forma mínima de `Response`, para manter o núcleo testável sem Electron. */
export interface RespostaRede {
  readonly ok: boolean
  readonly status: number
  json(): Promise<unknown>
}

export type BuscadorRede = (url: string, iniciacao: RequestInit) => Promise<RespostaRede>

/**
 * Cliente HTTP usado no processo principal pelo time de integrações.
 * O corpo volta como `unknown`: cada serviço valida com Zod antes de usar.
 */
export class TransporteHttp {
  constructor(
    private readonly buscar: BuscadorRede,
    private readonly timeoutMs: number = TIMEOUT_PADRAO_MS,
  ) {}

  async obterJson(url: string): Promise<unknown> {
    if (!urlExternaPermitida(url)) {
      throw new ErroSemPermissao('Dominio externo nao permitido.')
    }

    const resposta = await this.buscar(url, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    if (!resposta.ok) {
      throw new Error(`Falha HTTP ao consultar servico externo (${resposta.status}).`)
    }

    return resposta.json()
  }
}
