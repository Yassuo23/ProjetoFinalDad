import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaReservaCriar,
  esquemaReservaId,
  esquemaReservaListar,
  esquemaReservaPrevisao,
} from '../../../shared/contratos/esquemas'
import type { ServicoClima } from '../../servicos/ClimaServico'
import type { ServicoReservas } from '../../servicos/ReservaServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: validam pelo schema e delegam. Nenhuma regra nem SQL aqui. */
export function registrarReservas(
  registro: RegistroIpc,
  servico: ServicoReservas,
  clima: ServicoClima,
): void {
  registro.registrar(CANAIS.reservasListar, esquemaReservaListar, async (filtros) =>
    servico.listar(filtros ?? {}),
  )

  registro.registrar(CANAIS.reservasBuscarPorId, esquemaReservaId, async ({ id }) =>
    servico.buscarPorId(id),
  )

  registro.registrar(CANAIS.reservasCriar, esquemaReservaCriar, async (dados) =>
    servico.criar(dados),
  )

  registro.registrar(CANAIS.reservasConfirmar, esquemaReservaId, async ({ id }) =>
    servico.confirmar(id),
  )

  registro.registrar(CANAIS.reservasCancelar, esquemaReservaId, async ({ id }) => {
    servico.cancelar(id)
  })

  registro.registrar(CANAIS.reservasPrevisaoTempo, esquemaReservaPrevisao, async (entrada) =>
    clima.previsao(entrada),
  )
}
