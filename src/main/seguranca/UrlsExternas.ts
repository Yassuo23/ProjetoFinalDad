/**
 * Allowlist de links externos. URL vinda do renderer é sempre não confiável:
 * apenas `https:` e domínios explicitamente enumerados podem chegar ao `shell`.
 */
const DOMINIOS_PERMITIDOS = [
  'electronjs.org',
  'open-meteo.com',
  'viacep.com.br',
  'brasilapi.com.br',
] as const

export function urlExternaPermitida(bruta: string): boolean {
  try {
    const url = new URL(bruta)
    if (url.protocol !== 'https:') return false

    return DOMINIOS_PERMITIDOS.some(
      (dominio) => url.hostname === dominio || url.hostname.endsWith(`.${dominio}`),
    )
  } catch {
    return false
  }
}
