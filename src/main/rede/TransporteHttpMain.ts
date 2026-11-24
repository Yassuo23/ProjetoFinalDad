import { net } from 'electron'
import { TransporteHttp } from './TransporteHttp'

/** Adapter que injeta `net.fetch` do Electron no cliente testável. */
export function criarTransporteHttp(timeoutMs?: number): TransporteHttp {
  const buscar = (url: string, iniciacao: RequestInit): Promise<Response> => net.fetch(url, iniciacao)
  return timeoutMs === undefined ? new TransporteHttp(buscar) : new TransporteHttp(buscar, timeoutMs)
}
