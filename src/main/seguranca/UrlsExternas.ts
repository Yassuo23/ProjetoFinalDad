/** Allowlist explícita para links externos abertos a partir do renderer. */
const HOSTS_PERMITIDOS: ReadonlySet<string> = new Set([
  'electronjs.org',
  'www.electronjs.org',
  'github.com',
  'www.github.com',
])

/** Compara hostname (não `startsWith`) e exige HTTPS. */
export function urlExternaPermitida(valor: string): boolean {
  let url: URL
  try {
    url = new URL(valor)
  } catch {
    return false
  }
  return url.protocol === 'https:' && HOSTS_PERMITIDOS.has(url.hostname.toLowerCase())
}
