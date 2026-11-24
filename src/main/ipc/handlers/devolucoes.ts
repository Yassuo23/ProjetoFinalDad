import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaDevolucaoBuscarPorReserva,
  esquemaDevolucaoRegistrar,
  esquemaMultaCalcular,
} from '../../../shared/contratos/esquemas'
import type { ServicoDevolucoes } from '../../servicos/DevolucaoServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: validam pelo schema e delegam. Nenhuma regra nem SQL aqui. */
export function registrarDevolucoes(registro: RegistroIpc, servico: ServicoDevolucoes): void {
  registro.registrar(CANAIS.devolucoesRegistrar, esquemaDevolucaoRegistrar, async (dados) =>
    servico.registrar(dados),
  )

  registro.registrar(
    CANAIS.devolucoesBuscarPorReserva,
    esquemaDevolucaoBuscarPorReserva,
    async ({ reservaId }) => servico.buscarPorReserva(reservaId),
  )

  registro.registrar(CANAIS.multasCalcular, esquemaMultaCalcular, async (entrada) =>
    servico.calcular(entrada),
  )
}
