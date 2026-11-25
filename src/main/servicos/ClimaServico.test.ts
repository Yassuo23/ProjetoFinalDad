import { describe, expect, it, vi } from 'vitest'
import { ClimaServico } from './ClimaServico'
import { ClienteHttp } from './integracoes/ClienteHttp'

const HOJE = () => new Date('2026-11-25T12:00:00.000Z')
const DATA = '2026-11-26'

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function previsao(codigo = 0): unknown {
  return {
    daily: {
      time: [DATA],
      weather_code: [codigo],
      temperature_2m_max: [28],
      temperature_2m_min: [19],
      wind_speed_10m_max: [12],
    },
  }
}

function servicoCom(buscar: (url: URL, init?: RequestInit) => Promise<Response>): ClimaServico {
  return new ClimaServico(new ClienteHttp(buscar), {
    latitude: -23.55,
    longitude: -46.63,
    agora: HOJE,
  })
}

describe('ClimaServico', () => {
  it('busca previsão pela data da reserva e traduz o código WMO', async () => {
    const buscar = vi.fn(async (_url: URL, _init?: RequestInit) => resposta(previsao()))
    const consulta = await servicoCom(buscar).consultar(DATA)

    expect(consulta).toMatchObject({
      estado: 'disponivel',
      data: DATA,
      condicao: 'Ensolarado',
      descricao: 'Céu limpo',
      temperaturaMinC: 19,
      temperaturaMaxC: 28,
      ventoKmH: 12,
    })
    const [url, init] = buscar.mock.calls[0] as [URL, RequestInit | undefined]
    expect(url.origin).toBe('https://api.open-meteo.com')
    expect(url.searchParams.get('start_date')).toBe(DATA)
    expect(url.searchParams.get('end_date')).toBe(DATA)
    expect(url.searchParams.get('timezone')).toBe('America/Sao_Paulo')
    expect(init?.signal).toBeDefined()
  })

  it('usa geocodificação quando só a cidade está configurada', async () => {
    const buscar = vi.fn(async (url: URL) =>
      url.host === 'geocoding-api.open-meteo.com'
        ? resposta({ results: [{ name: 'São Paulo', latitude: -23.55, longitude: -46.63 }] })
        : resposta(previsao()),
    )
    const servico = new ClimaServico(new ClienteHttp(buscar), {
      cidade: 'Sao Paulo',
      agora: HOJE,
    })

    expect((await servico.consultar(DATA)).estado).toBe('disponivel')
    expect(buscar).toHaveBeenCalledTimes(2)
    expect(buscar.mock.calls[0]?.[0].origin).toBe('https://geocoding-api.open-meteo.com')
  })

  it('recusa datas passadas e fora da janela de 16 dias sem chamar a API', async () => {
    const buscar = vi.fn(async () => resposta(previsao()))
    const servico = servicoCom(buscar)

    expect(await servico.consultar('2026-11-24')).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(await servico.consultar('2027-01-01')).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(await servico.consultar('26/11/2026')).toMatchObject({
      estado: 'indisponivel',
      motivo: 'PESQUISA_INVALIDA',
    })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('devolve SEM_DADOS quando a data não volta no daily', async () => {
    const buscar = vi.fn(async () =>
      resposta({
        daily: {
          time: ['2026-11-27'],
          weather_code: [0],
          temperature_2m_max: [28],
          temperature_2m_min: [19],
          wind_speed_10m_max: [12],
        },
      }),
    )

    expect(await servicoCom(buscar).consultar(DATA)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('repete apenas 5xx/timeout e traduz para SERVICO_FORA', async () => {
    const servidorFora = vi.fn(async () => resposta({}, 500))
    expect(await servicoCom(servidorFora).consultar(DATA)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SERVICO_FORA',
    })
    expect(servidorFora).toHaveBeenCalledTimes(2)

    const timeout = vi.fn(async () => {
      throw new Error('timeout')
    })
    expect(await servicoCom(timeout).consultar(DATA)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SERVICO_FORA',
    })
    expect(timeout).toHaveBeenCalledTimes(2)
  })

  it('trata resposta inválida como SEM_DADOS sem nova tentativa', async () => {
    const buscar = vi.fn(async () => resposta({ daily: { time: [DATA] } }))

    expect(await servicoCom(buscar).consultar(DATA)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('formata resumo e avalia alta demanda reaproveitando o cache', async () => {
    const buscar = vi.fn(async () => resposta(previsao()))
    const servico = servicoCom(buscar)

    const resumo = await servico.resumo(DATA)
    const demanda = await servico.altaDemanda(DATA)
    await servico.consultar(DATA)

    expect(resumo).toBe('Previsão para 2026-11-26: Céu limpo, 19.0–28.0 °C, vento de 12 km/h.')
    expect(demanda).toBe(true)
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('marca chuva como baixa demanda e indisponibilidade como null', async () => {
    const chuvoso = servicoCom(vi.fn(async () => resposta(previsao(61))))
    expect(await chuvoso.altaDemanda(DATA)).toBe(false)

    const fora = servicoCom(vi.fn(async () => resposta({}, 503)))
    expect(await fora.altaDemanda(DATA)).toBeNull()
  })

  it('mantém o texto de indisponível sem bloquear o chamador', async () => {
    const servico = servicoCom(vi.fn(async () => resposta({}, 503)))
    expect(await servico.resumo(DATA)).toBe('Previsão indisponível para 2026-11-26.')
  })
})
