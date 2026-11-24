/** Políticas CSP por ambiente. Módulo puro: sem Electron, testável no Vitest. */
const BASE =
  "default-src 'self'; " +
  "img-src 'self' data:; font-src 'self' data:; " +
  "object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; "

/** Dev precisa de inline e WebSocket para o cliente/HMR do Vite. */
export function politicaCsp(isDev: boolean): string {
  if (isDev) {
    return (
      `${BASE} script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ` +
      "connect-src 'self' ws://localhost:5173 ws://127.0.0.1:5173"
    )
  }

  return `${BASE} script-src 'self'; style-src 'self'; connect-src 'self'`
}

/**
 * Devolve os cabeçalhos com a política do ambiente. Não usa `unsafe-eval` em
 * nenhum dos dois casos e remove uma política antiga antes de aplicar a nova.
 */
export function comCabecalhoCsp(
  cabecalhos: Readonly<Record<string, readonly string[] | undefined>> | undefined,
  isDev: boolean,
): Record<string, string[]> {
  const copia: Record<string, string[]> = {}

  for (const [chave, valores] of Object.entries(cabecalhos ?? {})) {
    if (chave.toLowerCase() === 'content-security-policy') continue
    copia[chave] = valores ? [...valores] : []
  }

  copia['Content-Security-Policy'] = [politicaCsp(isDev)]
  return copia
}
