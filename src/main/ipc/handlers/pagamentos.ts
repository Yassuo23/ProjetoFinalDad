import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaPagamentoBuscarPorReserva,
  esquemaPagamentoId,
  esquemaPagamentoListar,
  esquemaPagamentoRegistrar,
} from '../../../shared/contratos/esquemas'
import type { ServicoPagamentos } from '../../servicos/PagamentoServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: validam pelo schema e delegam. Nenhuma regra nem SQL aqui. */
export function registrarPagamentos(registro: RegistroIpc, servico: ServicoPagamentos): void {
  registro.registrar(CANAIS.pagamentosListar, esquemaPagamentoListar, async (filtros) =>
    servico.listar(filtros ?? {}),
  )

  registro.registrar(
    CANAIS.pagamentosBuscarPorReserva,
    esquemaPagamentoBuscarPorReserva,
    async ({ reservaId }) => servico.buscarPorReserva(reservaId),
  )

  registro.registrar(CANAIS.pagamentosRegistrar, esquemaPagamentoRegistrar, async (dados) =>
    servico.registrar(dados),
  )

  registro.registrar(CANAIS.pagamentosConfirmar, esquemaPagamentoId, async ({ id }) =>
    servico.confirmar(id),
  )

  registro.registrar(CANAIS.pagamentosEstornar, esquemaPagamentoId, async ({ id }) =>
    servico.estornar(id),
  )
}
