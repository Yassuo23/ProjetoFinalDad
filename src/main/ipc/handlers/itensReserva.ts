import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaChaveItemReserva,
  esquemaItemReservaAtualizar,
  esquemaItemReservaCriar,
  esquemaItemReservaListar,
} from '../../../shared/contratos/esquemas'
import { idClienteDaSessao } from '../../seguranca/EscopoCliente'
import type { ProvedorSessao, ServicoItensReserva } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Itens de reserva: escrita do balcão permitida; remoção física só administrador. */
export function registrarItensReserva(
  registro: RegistroIpc,
  servico: ServicoItensReserva,
  sessao: ProvedorSessao,
): void {
  registro.registrar(
    CANAIS.itensReservaListar,
    esquemaItemReservaListar,
    async (filtros) => servico.listar(filtros, idClienteDaSessao(sessao)),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.itensReservaBuscarPorId,
    esquemaChaveItemReserva,
    async (chave) => servico.buscarPorId(chave),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.itensReservaCriar,
    esquemaItemReservaCriar,
    async (dados) => servico.criar(dados),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.itensReservaAtualizar,
    esquemaItemReservaAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.ambos,
  )
  registro.registrar(CANAIS.itensReservaRemover, esquemaChaveItemReserva, async (chave) => {
    await servico.remover(chave)
  }, PERFIS.admin)
}
