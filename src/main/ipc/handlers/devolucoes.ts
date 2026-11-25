import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaDevolucaoAtualizar,
  esquemaDevolucaoCriar,
  esquemaDevolucaoListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import type { ServicoDevolucoes } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarDevolucoes(registro: RegistroIpc, servico: ServicoDevolucoes): void {
  registro.registrar(CANAIS.devolucoesListar, esquemaDevolucaoListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.devolucoesBuscarPorId, esquemaId, async ({ id }) =>
    servico.buscarPorId(id),
  )
  registro.registrar(CANAIS.devolucoesCriar, esquemaDevolucaoCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.devolucoesAtualizar, esquemaDevolucaoAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.devolucoesInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  })
}
