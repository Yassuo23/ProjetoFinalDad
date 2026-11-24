import type {
  PrevisaoDia,
  PrevisaoTempo,
  PrevisaoTempoEntrada,
} from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoClima {
  previsao(entrada: PrevisaoTempoEntrada): Promise<PrevisaoTempo>
}

interface LocalResolvido {
  nome: string
  latitude: number
  longitude: number
}

interface Periodo {
  inicio: string
  fim: string
}

const LIMITE_DIAS = 14
const URL_GEOCODING = 'https://geocoding-api.open-meteo.com/v1/search'
const URL_FORECAST = 'https://api.open-meteo.com/v1/forecast'
const CAMPOS_DIARIOS = 'temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code'

/** Clima do local da atividade. Só o main fala com a API; o renderer nunca vê URLs. */
export class ClimaServico implements ServicoClima {
  async previsao(entrada: PrevisaoTempoEntrada): Promise<PrevisaoTempo> {
    const periodo = validarPeriodo(entrada)

    try {
      const urlGeocoding =
        `${URL_GEOCODING}?name=${encodeURIComponent(entrada.local.trim())}` +
        '&count=1&language=pt&format=json'
      const local = localDoJson(await buscarJson(urlGeocoding))
      if (!local) {
        throw new ErroDeDominio('LOCAL_NAO_ENCONTRADO', 'Local não encontrado.')
      }

      const urlForecast =
        `${URL_FORECAST}?latitude=${local.latitude}&longitude=${local.longitude}` +
        `&daily=${CAMPOS_DIARIOS}&timezone=auto` +
        `&start_date=${periodo.inicio}&end_date=${periodo.fim}`
      const dias = diasDoJson(await buscarJson(urlForecast))
      if (!dias) {
        throw new ErroDeDominio('PREVISAO_INDISPONIVEL', 'Previsão indisponível.')
      }

      return { local: local.nome, latitude: local.latitude, longitude: local.longitude, dias }
    } catch (erro) {
      if (erro instanceof ErroDeDominio && erro.codigo === 'LOCAL_NAO_ENCONTRADO') throw erro
      throw new ErroDeDominio('PREVISAO_INDISPONIVEL', 'Previsão do tempo indisponível.')
    }
  }
}

async function buscarJson(url: string): Promise<unknown> {
  const resposta = await fetch(url)
  if (!resposta.ok) {
    throw new ErroDeDominio('PREVISAO_INDISPONIVEL', 'Previsão do tempo indisponível.')
  }
  const dados: unknown = await resposta.json()
  return dados
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function ehNumero(valor: unknown): valor is number {
  return typeof valor === 'number' && Number.isFinite(valor)
}

function validarPeriodo(entrada: PrevisaoTempoEntrada): Periodo {
  const inicio = entrada.inicio.slice(0, 10)
  const fim = entrada.fim.slice(0, 10)
  const inicioMs = Date.parse(`${inicio}T00:00:00Z`)
  const fimMs = Date.parse(`${fim}T00:00:00Z`)
  const inicioValido =
    /^\d{4}-\d{2}-\d{2}$/.test(inicio) &&
    Number.isFinite(inicioMs) &&
    new Date(inicioMs).toISOString().slice(0, 10) === inicio
  const fimValido =
    /^\d{4}-\d{2}-\d{2}$/.test(fim) &&
    Number.isFinite(fimMs) &&
    new Date(fimMs).toISOString().slice(0, 10) === fim

  const quantidadeDias = Math.round((fimMs - inicioMs) / 86_400_000) + 1
  if (
    !inicioValido ||
    !fimValido ||
    quantidadeDias < 1 ||
    quantidadeDias > LIMITE_DIAS
  ) {
    throw new ErroDeDominio(
      'PERIODO_INVALIDO',
      'Informe um período válido de até 14 dias.',
    )
  }

  return { inicio, fim }
}

function localDoJson(dados: unknown): LocalResolvido | null {
  if (!ehObjeto(dados) || !Array.isArray(dados.results) || dados.results.length === 0) return null

  const primeiro: unknown = dados.results[0]
  if (!ehObjeto(primeiro)) return null
  const { name, latitude, longitude } = primeiro
  if (typeof name !== 'string' || !ehNumero(latitude) || !ehNumero(longitude)) return null

  return { nome: name, latitude, longitude }
}

function diasDoJson(dados: unknown): PrevisaoDia[] | null {
  if (!ehObjeto(dados) || !ehObjeto(dados.daily)) return null
  const diario = dados.daily
  const datas = diario.time
  const minimas = diario.temperature_2m_min
  const maximas = diario.temperature_2m_max
  const precipitacoes = diario.precipitation_sum
  const codigos = diario.weather_code

  if (
    !Array.isArray(datas) ||
    !Array.isArray(minimas) ||
    !Array.isArray(maximas) ||
    !Array.isArray(precipitacoes) ||
    !Array.isArray(codigos) ||
    datas.length === 0 ||
    [minimas, maximas, precipitacoes, codigos].some((serie) => serie.length !== datas.length)
  ) {
    return null
  }

  const dias: PrevisaoDia[] = []
  for (let indice = 0; indice < datas.length; indice += 1) {
    const data: unknown = datas[indice]
    const minima: unknown = minimas[indice]
    const maxima: unknown = maximas[indice]
    const precipitacao: unknown = precipitacoes[indice]
    const codigo: unknown = codigos[indice]

    if (
      typeof data !== 'string' ||
      !ehNumero(minima) ||
      !ehNumero(maxima) ||
      !ehNumero(precipitacao) ||
      !ehNumero(codigo)
    ) {
      return null
    }

    dias.push({
      data: data.slice(0, 10),
      temperaturaMin: minima,
      temperaturaMax: maxima,
      precipitacaoMm: precipitacao,
      descricao: descricaoClima(codigo),
    })
  }
  return dias
}

/** Códigos WMO da Open-Meteo, descritos em pt-BR. */
function descricaoClima(codigo: number): string {
  switch (codigo) {
    case 0:
      return 'Céu limpo'
    case 1:
      return 'Predominantemente limpo'
    case 2:
      return 'Parcialmente nublado'
    case 3:
      return 'Nublado'
    case 45:
    case 48:
      return 'Neblina'
    case 51:
    case 53:
    case 55:
      return 'Garoa'
    case 56:
    case 57:
      return 'Garoa congelante'
    case 61:
    case 63:
    case 65:
      return 'Chuva'
    case 66:
    case 67:
      return 'Chuva congelante'
    case 71:
    case 73:
    case 75:
      return 'Neve'
    case 77:
      return 'Grãos de neve'
    case 80:
    case 81:
    case 82:
      return 'Pancadas de chuva'
    case 85:
    case 86:
      return 'Pancadas de neve'
    case 95:
      return 'Trovoadas'
    case 96:
    case 99:
      return 'Trovoadas com granizo'
    default:
      return 'Condição desconhecida'
  }
}
