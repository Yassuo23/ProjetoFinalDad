import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaEquipamentoAtualizar,
  esquemaEquipamentoCriar,
  esquemaEquipamentoListar,
  esquemaId,
  esquemaPeriodo,
} from '../../../shared/contratos/esquemas'
import type { ServicoEquipamentos } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarEquipamentos(
  registro: RegistroIpc,
  servico: ServicoEquipamentos,
): void {
  registro.registrar(
    CANAIS.equipamentosListar,
    esquemaEquipamentoListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.equipamentosBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.equipamentosListarDisponiveis,
    esquemaPeriodo,
    async (periodo) => servico.listarDisponiveis(periodo),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.equipamentosCriar,
    esquemaEquipamentoCriar,
    async (dados) => servico.criar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.equipamentosAtualizar,
    esquemaEquipamentoAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.admin,
  )
  registro.registrar(CANAIS.equipamentosInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
