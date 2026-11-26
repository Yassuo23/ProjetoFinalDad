import { vigiarSessao } from './VigilanciaSessao'
import type {
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
} from '../../../shared/contratos/modelos'

export class ServicoReservas {
  listar(filtros?: ReservaListarFiltros): Promise<Reserva[]> {
    return vigiarSessao(window.electronAPI.reservas.listar(filtros))
  }

  buscarPorId(id: number): Promise<Reserva> {
    return vigiarSessao(window.electronAPI.reservas.buscarPorId(id))
  }

  criar(dados: ReservaCriarEntrada): Promise<Reserva> {
    return vigiarSessao(window.electronAPI.reservas.criar(dados))
  }

  atualizar(dados: ReservaAtualizarEntrada): Promise<Reserva> {
    return vigiarSessao(window.electronAPI.reservas.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.reservas.inativar(id))
  }
}
