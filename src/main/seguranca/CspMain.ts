import { session } from 'electron'
import { comCabecalhoCsp } from './Csp'

/** Aplica a CSP por ambiente a todas as respostas carregadas na sessão. */
export function aplicarCsp(isDev: boolean): void {
  session.defaultSession.webRequest.onHeadersReceived((detalhes, callback) => {
    callback({ responseHeaders: comCabecalhoCsp(detalhes.responseHeaders, isDev) })
  })
}
