import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaId,
  esquemaManutencaoAtualizar,
  esquemaManutencaoConcluir,
  esquemaManutencaoCriar,
  esquemaManutencaoListar,
} from '../../../shared/contratos/esquemas'
import type { ServicoManutencao } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Staff consulta; abrir, editar, concluir e inativar são exclusivos do admin. */
export function registrarManutencao(registro: RegistroIpc, servico: ServicoManutencao): void {
  registro.registrar(
    CANAIS.manutencaoListar,
    esquemaManutencaoListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.manutencaoBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.manutencaoCriar,
    esquemaManutencaoCriar,
    async (dados) => servico.criar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.manutencaoAtualizar,
    esquemaManutencaoAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.manutencaoConcluir,
    esquemaManutencaoConcluir,
    async (dados) => servico.concluir(dados),
    PERFIS.admin,
  )
  registro.registrar(CANAIS.manutencaoInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
