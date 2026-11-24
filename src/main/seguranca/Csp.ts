import type { Session } from 'electron'
import { CSP_DEV, CSP_PRODUCAO } from '../../shared/seguranca/politicasCsp'

export function politicaCsp(isDev: boolean): string {
  return isDev ? CSP_DEV : CSP_PRODUCAO
}

/** Reforça a CSP via header HTTP; em produção a meta do HTML já é rigorosa. */
export function aplicarCsp(sessao: Session, isDev: boolean): void {
  const politica = politicaCsp(isDev)

  sessao.webRequest.onHeadersReceived((detalhes, callback) => {
    callback({
      responseHeaders: {
        ...(detalhes.responseHeaders ?? {}),
        'Content-Security-Policy': [politica],
      },
    })
  })
}
