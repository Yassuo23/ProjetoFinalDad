export type AmbienteCsp = 'desenvolvimento' | 'producao'

const DIRETIVAS_BASE: readonly string[] = [
  "default-src 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  'form-action \'self\'',
]

/**
 * CSP de produção não usa `unsafe-inline`, `unsafe-eval` nem `ws:`.
 * O modo dev mantém apenas o necessário para o HMR do Vite.
 */
export function politicaCsp(ambiente: AmbienteCsp): string {
  const especificas: readonly string[] =
    ambiente === 'desenvolvimento'
      ? [
          "script-src 'self' 'unsafe-inline'",
          "style-src 'self' 'unsafe-inline'",
          "connect-src 'self' ws:",
        ]
      : ["script-src 'self'", "style-src 'self'", "connect-src 'self'"]

  return [...DIRETIVAS_BASE, ...especificas].join('; ')
}
