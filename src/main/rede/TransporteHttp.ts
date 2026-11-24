import { urlExternaPermitida } from '../seguranca/UrlsExternas'

export type CodigoErroTransporte =
  | 'URL_NAO_PERMITIDA'
  | 'HTTP_FALHOU'
  | 'TEMPO_ESGOTADO'
  | 'FALHA_DE_REDE'
  | 'JSON_INVALIDO'
  | 'RESPOSTA_INVALIDA'

/** Erro interno do transporte: o serviço do API Engineer traduz para código de domínio. */
export class ErroTransporte extends Error {
  constructor(readonly codigo: CodigoErroTransporte) {
    super(codigo)
    this.name = 'ErroTransporte'
  }
}

/** Tipos estruturais para o `net.fetch` do Electron — o Vitest nunca importa o Electron. */
export interface OpcoesFetchHttp {
  signal?: AbortSignal
}

export interface RespostaHttp {
  readonly ok: boolean
  json(): Promise<unknown>
}

export interface ClienteHttp {
  fetch(url: string, init?: OpcoesFetchHttp): Promise<RespostaHttp>
}

export interface TransporteHttp {
  buscarJson<T>(url: string, validar: (dado: unknown) => T): Promise<T>
}

/**
 * Transporte HTTP do main. Aplica allowlist e timeout; não interpreta o payload —
 * quem consome é o serviço, que decide o erro de domínio.
 */
export class TransporteHttpSeguro implements TransporteHttp {
  constructor(
    private readonly cliente: ClienteHttp,
    private readonly timeoutMs = 8000,
  ) {}

  async buscarJson<T>(url: string, validar: (dado: unknown) => T): Promise<T> {
    if (!urlExternaPermitida(url)) {
      throw new ErroTransporte('URL_NAO_PERMITIDA')
    }

    let resposta: RespostaHttp
    try {
      resposta = await this.cliente.fetch(url, { signal: AbortSignal.timeout(this.timeoutMs) })
    } catch (erro) {
      const nome = erro instanceof Error ? erro.name : ''
      throw new ErroTransporte(nome === 'TimeoutError' || nome === 'AbortError' ? 'TEMPO_ESGOTADO' : 'FALHA_DE_REDE')
    }

    if (!resposta.ok) throw new ErroTransporte('HTTP_FALHOU')

    let bruto: unknown
    try {
      bruto = await resposta.json()
    } catch {
      throw new ErroTransporte('JSON_INVALIDO')
    }

    try {
      return validar(bruto)
    } catch {
      throw new ErroTransporte('RESPOSTA_INVALIDA')
    }
  }
}
