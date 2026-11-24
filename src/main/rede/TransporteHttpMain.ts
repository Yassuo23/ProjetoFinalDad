import { net } from 'electron'
import { TransporteHttpSeguro, type ClienteHttp, type TransporteHttp } from './TransporteHttp'

/**
 * Fábrica do transporte para o API Engineer: injete o retorno nos serviços que
 * consultam CEP, CNPJ, clima e feriados. O `net.fetch` respeita a sessão do app;
 * a allowlist e o timeout já vêm no `TransporteHttpSeguro`.
 */
export function criarTransporteHttp(timeoutMs = 8000): TransporteHttp {
  const cliente: ClienteHttp = {
    fetch(url, init) {
      return net.fetch(url, init)
    },
  }
  return new TransporteHttpSeguro(cliente, timeoutMs)
}
