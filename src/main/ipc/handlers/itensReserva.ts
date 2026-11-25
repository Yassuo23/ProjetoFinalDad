import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaChaveItemReserva,
  esquemaItemReservaAtualizar,
  esquemaItemReservaCriar,
  esquemaItemReservaListar,
} from '../../../shared/contratos/esquemas'
import type { ServicoItensReserva } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarItensReserva(
  registro: RegistroIpc,
  servico: ServicoItensReserva,
): void {
  registro.registrar(CANAIS.itensReservaListar, esquemaItemReservaListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.itensReservaBuscarPorId, esquemaChaveItemReserva, async (chave) =>
    servico.buscarPorId(chave),
  )
  registro.registrar(CANAIS.itensReservaCriar, esquemaItemReservaCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.itensReservaAtualizar, esquemaItemReservaAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.itensReservaRemover, esquemaChaveItemReserva, async (chave) => {
    await servico.remover(chave)
  })
}
