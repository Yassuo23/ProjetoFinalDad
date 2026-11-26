import { z } from 'zod'

/**
 * Schemas das respostas externas (DTO bruto). Ficam no main: nada disso pode
 * ser importado pelo preload/renderer (R2/R3). Tipos inferidos são usados
 * somente dentro dos serviços antes da conversão para os contratos do ADR 0007.
 */

const textoOpcional = z.string().trim().nullish()
const numeroOpcional = z.number().finite().nullish()

/**
 * ViaCEP responde `200 { erro: true }` quando o CEP não existe. O sinal é
 * validado como parte do DTO e interpretado pelo serviço (estado "não
 * encontrado"), distinto de corpo inválido (estado "indisponível").
 */
export const esquemaRespostaViaCep = z.object({
  cep: z.string().optional(),
  logradouro: z.string().optional(),
  bairro: z.string().optional(),
  localidade: z.string().optional(),
  uf: z.string().optional(),
  erro: z.boolean().optional(),
})

/** Open-Meteo Forecast: campos diários podem conter `null` em dias sem modelo. */
export const esquemaRespostaPrevisao = z.object({
  daily: z.object({
    time: z.array(z.iso.date()),
    weather_code: z.array(z.number().int()),
    temperature_2m_max: z.array(numeroOpcional),
    temperature_2m_min: z.array(numeroOpcional),
    wind_speed_10m_max: z.array(numeroOpcional),
  }),
})

/** Open-Meteo Geocoding: `results` pode faltar quando a cidade não é encontrada. */
export const esquemaRespostaGeocoding = z.object({
  results: z
    .array(
      z.object({
        name: z.string(),
        latitude: z.number().finite(),
        longitude: z.number().finite(),
        country: z.string().optional(),
        admin1: z.string().optional(),
      }),
    )
    .optional(),
})

/** BrasilAPI CNPJ: campos de endereço são opcionais na resposta real. */
export const esquemaRespostaCnpj = z.object({
  cnpj: z.string(),
  razao_social: z.string().trim().min(1),
  nome_fantasia: textoOpcional,
  situacao_cadastral: z.number().int().nullish(),
  cnae_fiscal_descricao: textoOpcional,
  logradouro: textoOpcional,
  numero: textoOpcional,
  complemento: textoOpcional,
  bairro: textoOpcional,
  municipio: textoOpcional,
  uf: textoOpcional,
  cep: textoOpcional,
})

/** BrasilAPI Feriados: pode incluir feriados estaduais/municipais; filtramos `national`. */
export const esquemaRespostaFeriados = z.array(
  z.object({
    date: z.iso.date(),
    name: z.string().trim().min(1),
    type: z.string(),
    weekday: z.string().optional(),
  }),
)

export type RespostaViaCep = z.infer<typeof esquemaRespostaViaCep>
export type RespostaPrevisaoExterna = z.infer<typeof esquemaRespostaPrevisao>
export type RespostaGeocodingExterna = z.infer<typeof esquemaRespostaGeocoding>
export type RespostaCnpjExterna = z.infer<typeof esquemaRespostaCnpj>
export type RespostaFeriadosExterna = z.infer<typeof esquemaRespostaFeriados>
