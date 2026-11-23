import type { Reserva } from '../../../shared/contratos/modelos'

export class ServicoReservas {
  listar(): Promise<Reserva[]> {
    return window.electronAPI.reservas.listar()
  }
}
