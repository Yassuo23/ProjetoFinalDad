import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaId,
  esquemaPagamentoAtualizar,
  esquemaPagamentoCriar,
  esquemaPagamentoListar,
} from '../../../shared/contratos/esquemas'
import type { ServicoPagamentos } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarPagamentos(registro: RegistroIpc, servico: ServicoPagamentos): void {
  registro.registrar(CANAIS.pagamentosListar, esquemaPagamentoListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.pagamentosBuscarPorId, esquemaId, async ({ id }) =>
    servico.buscarPorId(id),
  )
  registro.registrar(CANAIS.pagamentosCriar, esquemaPagamentoCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.pagamentosAtualizar, esquemaPagamentoAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.pagamentosInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  })
}
