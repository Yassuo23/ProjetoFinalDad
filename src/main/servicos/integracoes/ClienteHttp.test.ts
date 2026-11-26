import { z } from 'zod'
import { describe, expect, it, vi } from 'vitest'
import { CABECALHOS_PADRAO, ClienteHttp, HOSTS, TEMPO_LIMITE_MS } from './ClienteHttp'
import { ErroIntegracao, ErroNaoEncontrado } from './ErroIntegracao'

const esquema = z.object({ ok: z.boolean() })
const url = new URL('/api/cnpj/v1/11444777000161', HOSTS.brasilApi)

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status })
}

describe('ClienteHttp', () => {
  it('envia cabeçalhos identificáveis e sinal de timeout, e valida com Zod', async () => {
    const buscar = vi.fn(async (_url: URL, _init?: RequestInit) => resposta({ ok: true }))

    expect(await new ClienteHttp(buscar).obter(url, esquema, 1000)).toEqual({ ok: true })
    const [, init] = buscar.mock.calls[0] as [URL, RequestInit | undefined]
    expect(init?.headers).toEqual(CABECALHOS_PADRAO)
    expect(init?.signal).toBeInstanceOf(AbortSignal)
    expect(TEMPO_LIMITE_MS).toBe(6000)
  })

  it('recusa origem fora da allowlist antes do fetch', async () => {
    const buscar = vi.fn(async () => resposta({ ok: true }))
    const servico = new ClienteHttp(buscar)

    await expect(
      servico.obter(new URL('https://example.com/api'), esquema, 0),
    ).rejects.toMatchObject({ motivo: 'SERVICO_FORA' })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('não repete 403/404 e distingue não-encontrado de sem-dados', async () => {
    const proibido = vi.fn(async () => resposta({ error: '403' }, 403))
    await expect(new ClienteHttp(proibido).obter(url, esquema, 0)).rejects.toMatchObject({
      motivo: 'SEM_DADOS',
    })
    expect(proibido).toHaveBeenCalledTimes(1)

    const naoEncontrado = vi.fn(async () => resposta({}, 404))
    await expect(
      new ClienteHttp(naoEncontrado).obter(url, esquema, 0),
    ).rejects.toBeInstanceOf(ErroNaoEncontrado)
    expect(naoEncontrado).toHaveBeenCalledTimes(1)
  })

  it('repete no máximo uma vez em 429/5xx e nunca em corpo inválido', async () => {
    const limite = vi.fn(async () => resposta({}, 429))
    await expect(new ClienteHttp(limite).obter(url, esquema, 0)).rejects.toBeInstanceOf(
      ErroIntegracao,
    )
    expect(limite).toHaveBeenCalledTimes(2)

    const invalido = vi.fn(async () => resposta({ ok: 'sim' }))
    await expect(new ClienteHttp(invalido).obter(url, esquema, 0)).rejects.toMatchObject({
      motivo: 'SEM_DADOS',
    })
    expect(invalido).toHaveBeenCalledTimes(1)
  })
})
