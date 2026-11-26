import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaId,
  esquemaPagamentoAtualizar,
  esquemaPagamentoCriar,
  esquemaPagamentoListar,
} from '../../../shared/contratos/esquemas'
import type { ServicoPagamentos } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/**
 * Pagamentos: balcão registra e consulta (docs/requisitos-cliente.md);
 * inativação de cadastro é exclusiva da administração.
 */
export function registrarPagamentos(registro: RegistroIpc, servico: ServicoPagamentos): void {
  registro.registrar(
    CANAIS.pagamentosListar,
    esquemaPagamentoListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.pagamentosBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.pagamentosCriar,
    esquemaPagamentoCriar,
    async (dados) => servico.criar(dados),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.pagamentosAtualizar,
    esquemaPagamentoAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.ambos,
  )
  registro.registrar(CANAIS.pagamentosInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
