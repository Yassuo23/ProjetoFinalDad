import { describe, expect, it, vi } from 'vitest'
import { FeriadosServico } from './FeriadosServico'
import { ClienteHttp } from './integracoes/ClienteHttp'

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function feriados(): unknown {
  return [
    { date: '2026-01-01', name: 'Confraternização mundial', type: 'national', weekday: 'quinta-feira' },
    { date: '2026-01-15', name: 'Feriado estadual', type: 'state' },
    { date: '2026-02-16', name: 'Carnaval', type: 'national', weekday: 'segunda-feira' },
  ]
}

describe('FeriadosServico', () => {
  it('filtra apenas feriados nacionais e preserva o formato do contrato', async () => {
    const buscar = vi.fn(async (_url: URL, _init?: RequestInit) => resposta(feriados()))
    const resultado = await new FeriadosServico(new ClienteHttp(buscar)).feriados(2026)

    expect(resultado).toEqual({
      estado: 'disponivel',
      ano: 2026,
      feriados: [
        { data: '2026-01-01', nome: 'Confraternização mundial' },
        { data: '2026-02-16', nome: 'Carnaval' },
      ],
    })
    const [url, init] = buscar.mock.calls[0] as [URL, RequestInit | undefined]
    expect(url.origin).toBe('https://brasilapi.com.br')
    expect(url.pathname).toBe('/api/feriados/v1/2026')
    expect(init?.signal).toBeDefined()
  })

  it('recusa ano fora da faixa sem consultar a rede', async () => {
    const buscar = vi.fn(async () => resposta(feriados()))
    const resultado = await new FeriadosServico(new ClienteHttp(buscar)).feriados(2019)

    expect(resultado).toMatchObject({
      estado: 'indisponivel',
      motivo: 'PESQUISA_INVALIDA',
      feriados: [],
    })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('devolve lista vazia em 404 e em resposta inválida', async () => {
    const naoEncontrado = vi.fn(async () => resposta({ message: 'not found' }, 404))
    expect(
      await new FeriadosServico(new ClienteHttp(naoEncontrado)).feriados(2026),
    ).toMatchObject({ estado: 'indisponivel', motivo: 'SEM_DADOS', feriados: [] })
    expect(naoEncontrado).toHaveBeenCalledTimes(1)

    const invalido = vi.fn(async () => resposta([{ date: '2026-01-01' }]))
    expect(await new FeriadosServico(new ClienteHttp(invalido)).feriados(2026)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
      feriados: [],
    })
    expect(invalido).toHaveBeenCalledTimes(1)
  })

  it('repete 5xx/timeout e devolve SERVICO_FORA', async () => {
    const servidorFora = vi.fn(async () => resposta({}, 503))
    expect(
      await new FeriadosServico(new ClienteHttp(servidorFora)).feriados(2026),
    ).toMatchObject({ estado: 'indisponivel', motivo: 'SERVICO_FORA', feriados: [] })
    expect(servidorFora).toHaveBeenCalledTimes(2)

    const timeout = vi.fn(async () => {
      throw new Error('abortado')
    })
    expect(await new FeriadosServico(new ClienteHttp(timeout)).feriados(2026)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SERVICO_FORA',
    })
    expect(timeout).toHaveBeenCalledTimes(2)
  })

  it('cacheia por ano', async () => {
    const buscar = vi.fn(async () => resposta(feriados()))
    const servico = new FeriadosServico(new ClienteHttp(buscar))

    await servico.feriados(2026)
    await servico.feriados(2026)

    expect(buscar).toHaveBeenCalledTimes(1)
  })
})
