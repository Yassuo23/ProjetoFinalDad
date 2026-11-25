import type { ServicoClima } from './portas'

const LIMITE_CARACTERES = 500

function sinalTimeout(): AbortSignal | undefined {
  const construtor = AbortSignal as typeof AbortSignal & {
    readonly timeout?: (milissegundos: number) => AbortSignal
  }
  return typeof construtor.timeout === 'function' ? construtor.timeout(5000) : undefined
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

function numero(objeto: unknown, chave: string): number | null {
  if (typeof objeto !== 'object' || objeto === null || !(chave in objeto)) return null
  const valor = (objeto as Record<string, unknown>)[chave]
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function descricao(valor: unknown): string | null {
  if (!Array.isArray(valor)) return null
  return texto((valor[0] as { description?: unknown } | undefined)?.description)
}

export class ClimaServico implements ServicoClima {
  async resumo(dataInicio: string): Promise<string> {
    const chave = process.env.OPENWEATHER_API_KEY?.trim()
    if (!chave) {
      return `Previsão indisponível para ${dataInicio} (credencial de clima não configurada).`
    }

    const cidade = encodeURIComponent(process.env.CLIMA_CIDADE ?? 'Sao Paulo')
    // Hostname fixo: apenas a cidade vem de configuração do processo principal.
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${cidade}&appid=${chave}&units=metric&lang=pt`

    try {
      const sinal = sinalTimeout()
      const resposta = await (sinal === undefined ? fetch(url) : fetch(url, { signal: sinal }))
      if (!resposta.ok) return `Previsão indisponível para ${dataInicio}.`

      const corpo: unknown = await resposta.json()
      if (typeof corpo !== 'object' || corpo === null) {
        return `Previsão indisponível para ${dataInicio}.`
      }

      const dados = corpo as { weather?: unknown; main?: unknown; wind?: unknown }
      const partes: string[] = []
      const clima = descricao(dados.weather)
      const temperatura = numero(dados.main, 'temp')
      const vento = numero(dados.wind, 'speed')

      if (clima !== null) partes.push(clima)
      if (temperatura !== null) partes.push(`${temperatura.toFixed(1)} °C`)
      if (vento !== null) partes.push(`vento de ${vento} m/s`)

      const resumo =
        partes.length > 0
          ? `Previsão para ${dataInicio}: ${partes.join(', ')}.`
          : `Previsão indisponível para ${dataInicio}.`

      return resumo.slice(0, LIMITE_CARACTERES)
    } catch {
      // Clima nunca bloqueia a confirmação da reserva.
      return `Previsão indisponível para ${dataInicio}.`
    }
  }
}
