import type { ZodType } from 'zod'
import { ErroIntegracao, ErroNaoEncontrado } from './ErroIntegracao'

/** Hosts permitidos: constantes, https, nunca vindos do renderer ou de `.env`. */
export const HOSTS = {
  viacep: 'https://viacep.com.br',
  openMeteo: 'https://api.open-meteo.com',
  openMeteoGeocoding: 'https://geocoding-api.open-meteo.com',
  brasilApi: 'https://brasilapi.com.br',
} as const

export const TEMPO_LIMITE_MS = 6_000
/**
 * A borda da BrasilAPI recusa o `User-Agent` padrão do Node (`node`) com 403;
 * um agente identificável e o `Accept` explícito foram verificados com 200 em
 * CNPJ, feriados e ViaCEP em 26/11/2026. Não é credencial nem segredo.
 */
export const CABECALHOS_PADRAO: Readonly<Record<string, string>> = {
  'User-Agent': 'Zenite/0.1',
  Accept: 'application/json',
}
/** Uma original + no máximo uma nova tentativa (ADR 0008). */
const TOTAL_TENTATIVAS = 2

const ORIGENS_PERMITIDAS: readonly string[] = Object.values(HOSTS).map(
  (host) => new URL(host).origin,
)

type Buscador = (url: URL, init?: RequestInit) => Promise<Response>

interface EntradaCache {
  readonly expiraEm: number
  readonly valor: unknown
}

/**
 * Cliente único das integrações: timeout, nova tentativa seletiva, cache em
 * memória com TTL e validação Zod. Falhas viram `ErroIntegracao` — nunca
 * `Response`, status HTTP, URL ou stack.
 */
export class ClienteHttp {
  private readonly cache = new Map<string, EntradaCache>()

  constructor(
    private readonly buscar: Buscador = (url, init) => globalThis.fetch(url, init),
    private readonly agora: () => number = () => Date.now(),
  ) {}

  async obter<T>(url: URL, esquema: ZodType<T>, ttlMs: number): Promise<T> {
    this.validarOrigem(url)
    const chave = url.toString()

    const emCache = this.cache.get(chave)
    if (emCache !== undefined && emCache.expiraEm > this.agora()) {
      return emCache.valor as T
    }

    let ultimoErro: ErroIntegracao | undefined

    for (let tentativa = 0; tentativa < TOTAL_TENTATIVAS; tentativa += 1) {
      try {
        const resposta = await this.buscar(url, {
          signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
          headers: CABECALHOS_PADRAO,
        })

        if (!resposta.ok) {
          if (resposta.status === 429 || resposta.status >= 500) {
            ultimoErro = new ErroIntegracao('SERVICO_FORA')
            continue
          }
          throw resposta.status === 404
            ? new ErroNaoEncontrado()
            : new ErroIntegracao('SEM_DADOS')
        }

        let corpo: unknown
        try {
          corpo = await resposta.json()
        } catch {
          throw new ErroIntegracao('SEM_DADOS')
        }

        const validado = esquema.safeParse(corpo)
        if (!validado.success) throw new ErroIntegracao('SEM_DADOS')

        this.cache.set(chave, { expiraEm: this.agora() + ttlMs, valor: validado.data })
        return validado.data
      } catch (erro) {
        if (erro instanceof ErroIntegracao && erro.motivo === 'SEM_DADOS') throw erro
        ultimoErro = new ErroIntegracao('SERVICO_FORA')
      }
    }

    throw ultimoErro ?? new ErroIntegracao('SERVICO_FORA')
  }

  private validarOrigem(url: URL): void {
    if (url.protocol !== 'https:' || !ORIGENS_PERMITIDAS.includes(url.origin)) {
      throw new ErroIntegracao('SERVICO_FORA')
    }
  }
}
