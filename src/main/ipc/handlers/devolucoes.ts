import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaDevolucaoAtualizar,
  esquemaDevolucaoCriar,
  esquemaDevolucaoListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import type { ServicoDevolucoes } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Balcão registra devoluções; inativação é exclusiva da administração. */
export function registrarDevolucoes(registro: RegistroIpc, servico: ServicoDevolucoes): void {
  registro.registrar(
    CANAIS.devolucoesListar,
    esquemaDevolucaoListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.devolucoesBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.devolucoesCriar,
    esquemaDevolucaoCriar,
    async (dados) => servico.criar(dados),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.devolucoesAtualizar,
    esquemaDevolucaoAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.ambos,
  )
  registro.registrar(CANAIS.devolucoesInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
