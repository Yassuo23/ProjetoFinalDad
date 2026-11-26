import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaId,
  esquemaReservaAtualizar,
  esquemaReservaCriar,
  esquemaReservaListar,
} from '../../../shared/contratos/esquemas'
import { idClienteDaSessao } from '../../seguranca/EscopoCliente'
import type { ProvedorSessao, ServicoReservas } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Cliente vê e escreve somente as próprias reservas; balcão segue irrestrito. */
export function registrarReservas(
  registro: RegistroIpc,
  servico: ServicoReservas,
  sessao: ProvedorSessao,
): void {
  registro.registrar(
    CANAIS.reservasListar,
    esquemaReservaListar,
    async (filtros) => servico.listar(filtros, idClienteDaSessao(sessao)),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.reservasBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id, idClienteDaSessao(sessao)),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.reservasCriar,
    esquemaReservaCriar,
    async (dados) => {
      const dono = idClienteDaSessao(sessao)
      return servico.criar({ ...dados, clienteId: dono ?? dados.clienteId }, dono)
    },
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.reservasAtualizar,
    esquemaReservaAtualizar,
    async (dados) => {
      const dono = idClienteDaSessao(sessao)
      return servico.atualizar({ ...dados, clienteId: dono ?? dados.clienteId }, dono)
    },
    PERFIS.autenticados,
  )
  registro.registrar(CANAIS.reservasInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
