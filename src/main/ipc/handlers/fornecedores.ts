import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaFornecedorAtualizar,
  esquemaFornecedorCriar,
  esquemaFornecedorListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import type { ServicoFornecedores } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Fornecedores são cadastro administrativo: nem leitura é liberada ao balcão. */
export function registrarFornecedores(
  registro: RegistroIpc,
  servico: ServicoFornecedores,
): void {
  registro.registrar(
    CANAIS.fornecedoresListar,
    esquemaFornecedorListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.fornecedoresBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.fornecedoresCriar,
    esquemaFornecedorCriar,
    async (dados) => servico.criar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.fornecedoresAtualizar,
    esquemaFornecedorAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.admin,
  )
  registro.registrar(CANAIS.fornecedoresInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
