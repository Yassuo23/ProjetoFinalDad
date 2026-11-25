import type {
  CondicaoTempo,
  MotivoIndisponibilidade,
  RespostaPrevisaoTempo,
} from '../../shared/contratos/modelos'
import { ClienteHttp, HOSTS } from './integracoes/ClienteHttp'
import { ErroIntegracao, motivoIntegracao } from './integracoes/ErroIntegracao'
import {
  esquemaRespostaGeocoding,
  esquemaRespostaPrevisao,
} from './integracoes/esquemasExternos'
import type { ServicoClima, ServicoPrevisaoTempo } from './portas'

const LIMITE_CARACTERES = 500
const DIAS_MAXIMOS_PREVISAO = 16
const MS_POR_DIA = 86_400_000
const TTL_PREVISAO_MS = 30 * 60 * 1000
const TTL_GEOCODING_MS = 24 * 60 * 60 * 1000
const CAMPOS_DIARIOS = 'weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max'

interface ConfiguracaoClima {
  readonly latitude?: number
  readonly longitude?: number
  readonly cidade: string
  readonly agora: () => Date
}

interface Coordenadas {
  readonly latitude: number
  readonly longitude: number
}

function numeroEnv(nome: string): number | undefined {
  const bruto = process.env[nome]?.trim()
  if (bruto === undefined || bruto === '') return undefined
  const valor = Number(bruto)
  return Number.isFinite(valor) ? valor : undefined
}

function configuracaoDoAmbiente(): ConfiguracaoClima {
  const latitude = numeroEnv('CLIMA_LATITUDE')
  const longitude = numeroEnv('CLIMA_LONGITUDE')
  return {
    ...(latitude === undefined ? {} : { latitude }),
    ...(longitude === undefined ? {} : { longitude }),
    cidade: process.env.CLIMA_CIDADE?.trim() || 'Sao Paulo',
    agora: () => new Date(),
  }
}

function numeroOuNulo(valor: number | null | undefined): number | null {
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function condicaoWmo(codigo: number): CondicaoTempo {
  if (codigo >= 0 && codigo <= 2) return 'Ensolarado'
  if (codigo === 3 || codigo === 45 || codigo === 48) return 'Nublado'
  if (
    (codigo >= 51 && codigo <= 67) ||
    (codigo >= 80 && codigo <= 82) ||
    codigo === 95 ||
    codigo === 96 ||
    codigo === 99
  ) {
    return 'Chuvoso'
  }
  return 'Outro'
}

function descricaoWmo(codigo: number): string {
  const descricoes: Readonly<Record<number, string>> = {
    0: 'Céu limpo',
    1: 'Predominantemente limpo',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Neblina',
    48: 'Neblina com geada',
    51: 'Garoa leve',
    53: 'Garoa moderada',
    55: 'Garoa forte',
    56: 'Garoa congelante leve',
    57: 'Garoa congelante forte',
    61: 'Chuva leve',
    63: 'Chuva moderada',
    65: 'Chuva forte',
    66: 'Chuva congelante leve',
    67: 'Chuva congelante forte',
    71: 'Neve leve',
    73: 'Neve moderada',
    75: 'Neve forte',
    77: 'Grãos de neve',
    80: 'Pancadas de chuva leves',
    81: 'Pancadas de chuva moderadas',
    82: 'Pancadas de chuva fortes',
    85: 'Pancadas de neve leves',
    86: 'Pancadas de neve fortes',
    95: 'Trovoadas',
    96: 'Trovoadas com granizo leve',
    99: 'Trovoadas com granizo forte',
  }
  return descricoes[codigo] ?? `Código WMO ${codigo}`
}

function indisponivel(data: string, motivo: MotivoIndisponibilidade): RespostaPrevisaoTempo {
  return { estado: 'indisponivel', data, motivo }
}

/**
 * Integração com Open-Meteo e adaptador de texto para o contrato antigo.
 * Uma única instância compartilha o cliente HTTP — `resumo` e `altaDemanda`
 * reaproveitam a mesma resposta em cache.
 */
export class ClimaServico implements ServicoClima, ServicoPrevisaoTempo {
  private readonly http: ClienteHttp
  private readonly configuracao: ConfiguracaoClima

  constructor(http?: ClienteHttp, configuracao?: Partial<ConfiguracaoClima>) {
    const base = configuracaoDoAmbiente()
    this.http = http ?? new ClienteHttp()
    this.configuracao = {
      latitude: configuracao?.latitude ?? base.latitude,
      longitude: configuracao?.longitude ?? base.longitude,
      cidade: configuracao?.cidade ?? base.cidade,
      agora: configuracao?.agora ?? base.agora,
    }
  }

  async consultar(data: string): Promise<RespostaPrevisaoTempo> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !Number.isFinite(Date.parse(`${data}T00:00:00Z`))) {
      return indisponivel(data, 'PESQUISA_INVALIDA')
    }
    if (!this.dentroDaJanela(data)) return indisponivel(data, 'SEM_DADOS')

    try {
      const coordenadas = await this.resolverCoordenadas()
      // Host fixo; data e coordenadas são codificadas antes de entrar na URL.
      const url = new URL(
        `/v1/forecast?latitude=${encodeURIComponent(String(coordenadas.latitude))}` +
          `&longitude=${encodeURIComponent(String(coordenadas.longitude))}` +
          `&daily=${encodeURIComponent(CAMPOS_DIARIOS)}` +
          `&timezone=${encodeURIComponent('America/Sao_Paulo')}` +
          `&start_date=${encodeURIComponent(data)}&end_date=${encodeURIComponent(data)}`,
        HOSTS.openMeteo,
      )

      const corpo = await this.http.obter(url, esquemaRespostaPrevisao, TTL_PREVISAO_MS)
      const indice = corpo.daily.time.indexOf(data)
      if (indice < 0) throw new ErroIntegracao('SEM_DADOS')

      const codigo = numeroOuNulo(corpo.daily.weather_code[indice])
      return {
        estado: 'disponivel',
        data,
        condicao: codigo === null ? null : condicaoWmo(codigo),
        descricao: codigo === null ? null : descricaoWmo(codigo),
        temperaturaMinC: numeroOuNulo(corpo.daily.temperature_2m_min[indice]),
        temperaturaMaxC: numeroOuNulo(corpo.daily.temperature_2m_max[indice]),
        ventoKmH: numeroOuNulo(corpo.daily.wind_speed_10m_max[indice]),
      }
    } catch (erro) {
      return { estado: 'indisponivel', data, motivo: motivoIntegracao(erro) }
    }
  }

  async resumo(dataInicio: string): Promise<string> {
    const previsao = await this.consultar(dataInicio)
    if (previsao.estado === 'indisponivel') return `Previsão indisponível para ${dataInicio}.`

    const partes: string[] = []
    if (previsao.descricao !== null) partes.push(previsao.descricao)
    else if (previsao.condicao !== null) partes.push(previsao.condicao)

    const minima = previsao.temperaturaMinC
    const maxima = previsao.temperaturaMaxC
    if (minima !== null && maxima !== null) partes.push(`${minima.toFixed(1)}–${maxima.toFixed(1)} °C`)
    else if (maxima !== null) partes.push(`máx. ${maxima.toFixed(1)} °C`)

    if (previsao.ventoKmH !== null) partes.push(`vento de ${previsao.ventoKmH.toFixed(0)} km/h`)

    const texto =
      partes.length > 0
        ? `Previsão para ${dataInicio}: ${partes.join(', ')}.`
        : `Previsão indisponível para ${dataInicio}.`
    return texto.slice(0, LIMITE_CARACTERES)
  }

  async altaDemanda(data: string): Promise<boolean | null> {
    return this.avaliarAltaDemanda(await this.consultar(data))
  }

  private avaliarAltaDemanda(previsao: RespostaPrevisaoTempo): boolean | null {
    if (previsao.estado === 'indisponivel') return null
    const { condicao, temperaturaMaxC, ventoKmH } = previsao
    if (condicao === null || temperaturaMaxC === null || ventoKmH === null) return null
    if (condicao === 'Chuvoso' || condicao === 'Outro') return false
    if (temperaturaMaxC < 15 || temperaturaMaxC > 35 || ventoKmH >= 35) return false
    return temperaturaMaxC >= 18 && temperaturaMaxC <= 32
  }

  private dentroDaJanela(data: string): boolean {
    const hoje = this.configuracao.agora().toISOString().slice(0, 10)
    const inicio = Date.parse(`${hoje}T00:00:00Z`)
    const fim = Date.parse(`${data}T00:00:00Z`)
    if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return false
    const dias = Math.round((fim - inicio) / MS_POR_DIA)
    return dias >= 0 && dias <= DIAS_MAXIMOS_PREVISAO
  }

  private async resolverCoordenadas(): Promise<Coordenadas> {
    const { latitude, longitude, cidade } = this.configuracao
    if (latitude !== undefined && longitude !== undefined) {
      if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
        throw new ErroIntegracao('PESQUISA_INVALIDA')
      }
      return { latitude, longitude }
    }

    const url = new URL(
      `/v1/search?name=${encodeURIComponent(cidade)}&count=1&language=pt&format=json`,
      HOSTS.openMeteoGeocoding,
    )
    const geo = await this.http.obter(url, esquemaRespostaGeocoding, TTL_GEOCODING_MS)
    const primeira = geo.results?.[0]
    if (primeira === undefined) throw new ErroIntegracao('SEM_DADOS')
    return { latitude: primeira.latitude, longitude: primeira.longitude }
  }
}
