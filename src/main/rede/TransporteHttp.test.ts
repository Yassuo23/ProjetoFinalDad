import { describe, expect, it, vi } from 'vitest'
import { ErroTransporte, TransporteHttpSeguro, type ClienteHttp } from './TransporteHttp'

function clienteQueResponde(resposta: Response, registrar?: (init?: RequestInit) => void): ClienteHttp {
  return {
    fetch: async (_url, init) => {
      registrar?.(init)
      return resposta
    },
  }
}

describe('TransporteHttpSeguro', () => {
  it('usa fetch com timeout e devolve o JSON validado', async () => {
    let sinal: AbortSignal | undefined
    const transporte = new TransporteHttpSeguro(
      clienteQueResponde(new Response('{"cidade":"São Paulo"}'), (init) => {
        sinal = init?.signal as AbortSignal | undefined
      }),
      3000,
    )

    const resultado = await transporte.buscarJson('https://viacep.com.br/ws/01001000/json/', (dado) => {
      const objeto = dado as { cidade?: string }
      return objeto.cidade ?? ''
    })

    expect(resultado).toBe('São Paulo')
    expect(sinal?.aborted).toBe(false)
  })

  it('rejeita URL fora da allowlist antes de chamar fetch', async () => {
    const fetch = vi.fn(async () => new Response('{}'))
    const transporte = new TransporteHttpSeguro({ fetch })

    await expect(transporte.buscarJson('file:///C:/windows/system32/calc.exe', (d) => d)).rejects.toThrow(
      'URL_NAO_PERMITIDA',
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('traduz HTTP não-OK, JSON inválido e validação falha', async () => {
    const http = new TransporteHttpSeguro(clienteQueResponde(new Response('', { status: 503 })))
    const json = new TransporteHttpSeguro(clienteQueResponde(new Response('{')))
    const validacao = new TransporteHttpSeguro(clienteQueResponde(new Response('{}')))

    await expect(http.buscarJson('https://viacep.com.br/ws/x/json/', (d) => d)).rejects.toBeInstanceOf(
      ErroTransporte,
    )
    await expect(json.buscarJson('https://viacep.com.br/ws/x/json/', (d) => d)).rejects.toThrow(
      'JSON_INVALIDO',
    )
    await expect(
      validacao.buscarJson('https://viacep.com.br/ws/x/json/', () => {
        throw new Error('formato inesperado')
      }),
    ).rejects.toThrow('RESPOSTA_INVALIDA')
  })

  it('distingue timeout de falha de rede', async () => {
    const timeout: ClienteHttp = {
      fetch: async () => {
        throw Object.assign(new Error('timeout'), { name: 'TimeoutError' })
      },
    }
    const rede: ClienteHttp = {
      fetch: async () => {
        throw new Error('socket')
      },
    }

    await expect(
      new TransporteHttpSeguro(timeout).buscarJson('https://viacep.com.br/ws/x/json/', (d) => d),
    ).rejects.toThrow('TEMPO_ESGOTADO')
    await expect(
      new TransporteHttpSeguro(rede).buscarJson('https://viacep.com.br/ws/x/json/', (d) => d),
    ).rejects.toThrow('FALHA_DE_REDE')
  })
})
