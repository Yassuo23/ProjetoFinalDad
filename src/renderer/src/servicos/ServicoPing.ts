import type { PingPayload } from '../../../shared/contratos/modelos'

/** Encapsula a subscrição de ping; devolve o unsubscribe do contrato. */
export class ServicoPing {
  observar(callback: (payload: PingPayload) => void): () => void {
    return window.electronAPI.onPing(callback)
  }
}
