/** Domínios externos que o app pode abrir no navegador do usuário. */
const DOMINIOS_PERMITIDOS: ReadonlySet<string> = new Set([
  'electronjs.org',
  'www.electronjs.org',
  'checkout.stripe.com',
])

export class ErroUrlNaoPermitida extends Error {
  constructor() {
    super('Este link externo não é permitido pela aplicação.')
    this.name = 'ErroUrlNaoPermitida'
  }
}

export function urlExternaPermitida(url: string): boolean {
  try {
    const destino = new URL(url)
    return (
      destino.protocol === 'https:' &&
      destino.port === '' &&
      destino.username === '' &&
      destino.password === '' &&
      DOMINIOS_PERMITIDOS.has(destino.hostname.toLowerCase())
    )
  } catch {
    return false
  }
}

/** Chamada obrigatória antes de qualquer `shell.openExternal`. */
export function validarUrlExterna(url: string): void {
  if (!urlExternaPermitida(url)) {
    throw new ErroUrlNaoPermitida()
  }
}
