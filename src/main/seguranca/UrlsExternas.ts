/**
 * Allowlist de links externos abertos pelo renderer.
 *
 * Sem isso, um conteúdo injectado poderia pedir ao main para abrir
 * `file:///C:/Windows/System32/calc.exe` — o renderer nunca deve decidir
 * qual programa o sistema operacional executa.
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
