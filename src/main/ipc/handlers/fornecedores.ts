import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaFornecedorAtualizar,
  esquemaFornecedorCriar,
  esquemaFornecedorListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import type { ServicoFornecedores } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarFornecedores(
  registro: RegistroIpc,
  servico: ServicoFornecedores,
): void {
  registro.registrar(CANAIS.fornecedoresListar, esquemaFornecedorListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.fornecedoresBuscarPorId, esquemaId, async ({ id }) =>
    servico.buscarPorId(id),
  )
  registro.registrar(CANAIS.fornecedoresCriar, esquemaFornecedorCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.fornecedoresAtualizar, esquemaFornecedorAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.fornecedoresInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  })
}
