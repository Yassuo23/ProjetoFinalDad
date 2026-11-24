import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CodigoErroDominio } from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'
import { ClimaServico } from './ClimaServico'

const ENTRADA = {
  local: 'Campos do Jordao',
  inicio: '2026-12-01T08:00:00.000Z',
  fim: '2026-12-03T18:00:00.000Z',
}

const GEOCODING =
  'https://geocoding-api.open-meteo.com/v1/search?name=Campos%20do%20Jordao' +
  '&count=1&language=pt&format=json'

const FORECAST =
  'https://api.open-meteo.com/v1/forecast?latitude=-22.7&longitude=-45.5' +
  '&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code' +
  '&timezone=auto&start_date=2026-12-01&end_date=2026-12-03'

function respostaJson(dados: unknown, status = 200): Response {
  return Response.json(dados, { status })
}

function geocodigo(): unknown {
  return {
    results: [{ name: 'Campos do Jordão', latitude: -22.7, longitude: -45.5 }],
  }
}

function climatologia(codigos: readonly number[] = [0, 63, 95]): unknown {
  const datas = ['2026-12-01', '2026-12-02', '2026-12-03']
  const minimas = [8, 9, 7]
  const maximas = [22, 19, 17]
  const precipitacoes = [0, 12.4, 30]
  return {
    daily: {
      time: codigos.map((_codigo, indice) => datas[indice] ?? `2026-12-${indice + 1}`),
      temperature_2m_min: codigos.map((_codigo, indice) => minimas[indice] ?? 8),
      temperature_2m_max: codigos.map((_codigo, indice) => maximas[indice] ?? 18),
      precipitation_sum: codigos.map((_codigo, indice) => precipitacoes[indice] ?? 0),
      weather_code: [...codigos],
    },
  }
}

async function codigoDaRejeicao(acao: () => Promise<unknown>): Promise<CodigoErroDominio> {
  try {
    await acao()
  } catch (erro) {
    if (erro instanceof ErroDeDominio) {
      expect(erro.message).toBe(erro.codigo)
      return erro.codigo
    }
    throw erro
  }
  throw new Error('Era esperado um erro de domínio')
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ClimaServico', () => {
  it('resolve o local e devolve a previsão diária nos dois endpoints', async () => {
    const buscar = vi.fn(async (url: string): Promise<Response> => {
      if (url === GEOCODING) return respostaJson(geocodigo())
      expect(url).toBe(FORECAST)
      return respostaJson(climatologia())
    })
    vi.stubGlobal('fetch', buscar)

    await expect(new ClimaServico().previsao(ENTRADA)).resolves.toEqual({
      local: 'Campos do Jordão',
      latitude: -22.7,
      longitude: -45.5,
      dias: [
        {
          data: '2026-12-01',
          temperaturaMin: 8,
          temperaturaMax: 22,
          precipitacaoMm: 0,
          descricao: 'Céu limpo',
        },
        {
          data: '2026-12-02',
          temperaturaMin: 9,
          temperaturaMax: 19,
          precipitacaoMm: 12.4,
          descricao: 'Chuva',
        },
        {
          data: '2026-12-03',
          temperaturaMin: 7,
          temperaturaMax: 17,
          precipitacaoMm: 30,
          descricao: 'Trovoadas',
        },
      ],
    })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('traduz códigos WMO adicionais para pt-BR', async () => {
    const buscar = vi.fn(async (url: string): Promise<Response> =>
      url === GEOCODING ? respostaJson(geocodigo()) : respostaJson(climatologia([3, 48, 71, 96, 999])),
    )
    vi.stubGlobal('fetch', buscar)

    const previsao = await new ClimaServico().previsao({
      ...ENTRADA,
      fim: '2026-12-05T18:00:00.000Z',
    })

    expect(previsao.dias.map((dia) => dia.descricao)).toEqual([
      'Nublado',
      'Neblina',
      'Neve',
      'Trovoadas com granizo',
      'Condição desconhecida',
    ])
  })

  it('devolve LOCAL_NAO_ENCONTRADO sem consultar o forecast', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => respostaJson({ results: [] }))
    vi.stubGlobal('fetch', buscar)

    expect(await codigoDaRejeicao(() => new ClimaServico().previsao(ENTRADA))).toBe(
      'LOCAL_NAO_ENCONTRADO',
    )
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('transforma HTTP não-OK em PREVISAO_INDISPONIVEL', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => respostaJson({}, 503))
    vi.stubGlobal('fetch', buscar)

    expect(await codigoDaRejeicao(() => new ClimaServico().previsao(ENTRADA))).toBe(
      'PREVISAO_INDISPONIVEL',
    )
  })

  it('transforma falha de rede em PREVISAO_INDISPONIVEL', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => {
      throw new Error('ECONNRESET')
    })
    vi.stubGlobal('fetch', buscar)

    expect(await codigoDaRejeicao(() => new ClimaServico().previsao(ENTRADA))).toBe(
      'PREVISAO_INDISPONIVEL',
    )
  })

  it('transforma JSON inválido e payload malformado em PREVISAO_INDISPONIVEL', async () => {
    const buscarInvalido = vi.fn(async (_url: string): Promise<Response> =>
      new Response('{', { status: 200 }),
    )
    vi.stubGlobal('fetch', buscarInvalido)
    expect(await codigoDaRejeicao(() => new ClimaServico().previsao(ENTRADA))).toBe(
      'PREVISAO_INDISPONIVEL',
    )

    const buscarMalformado = vi.fn(async (url: string): Promise<Response> =>
      url === GEOCODING ? respostaJson(geocodigo()) : respostaJson({ daily: {} }),
    )
    vi.stubGlobal('fetch', buscarMalformado)
    expect(await codigoDaRejeicao(() => new ClimaServico().previsao(ENTRADA))).toBe(
      'PREVISAO_INDISPONIVEL',
    )
  })

  it('rejeita período invertido sem chamar a API', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => respostaJson(geocodigo()))
    vi.stubGlobal('fetch', buscar)

    expect(
      await codigoDaRejeicao(() =>
        new ClimaServico().previsao({ ...ENTRADA, inicio: ENTRADA.fim, fim: ENTRADA.inicio }),
      ),
    ).toBe('PERIODO_INVALIDO')
    expect(buscar).not.toHaveBeenCalled()
  })

  it('rejeita período acima de 14 dias sem chamar a API', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => respostaJson(geocodigo()))
    vi.stubGlobal('fetch', buscar)

    expect(
      await codigoDaRejeicao(() =>
        new ClimaServico().previsao({ ...ENTRADA, fim: '2026-12-16T18:00:00.000Z' }),
      ),
    ).toBe('PERIODO_INVALIDO')
    expect(buscar).not.toHaveBeenCalled()
  })
})
