import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaId,
  esquemaReservaAtualizar,
  esquemaReservaCriar,
  esquemaReservaListar,
} from '../../../shared/contratos/esquemas'
import type { ServicoReservas } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarReservas(registro: RegistroIpc, servico: ServicoReservas): void {
  registro.registrar(CANAIS.reservasListar, esquemaReservaListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.reservasBuscarPorId, esquemaId, async ({ id }) =>
    servico.buscarPorId(id),
  )
  registro.registrar(CANAIS.reservasCriar, esquemaReservaCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.reservasAtualizar, esquemaReservaAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.reservasInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  })
}
