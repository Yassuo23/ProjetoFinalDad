import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaEquipamentoAtualizar,
  esquemaEquipamentoCriar,
  esquemaEquipamentoListar,
  esquemaId,
  esquemaPeriodo,
} from '../../../shared/contratos/esquemas'
import type { ServicoEquipamentos } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarEquipamentos(
  registro: RegistroIpc,
  servico: ServicoEquipamentos,
): void {
  registro.registrar(CANAIS.equipamentosListar, esquemaEquipamentoListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.equipamentosBuscarPorId, esquemaId, async ({ id }) =>
    servico.buscarPorId(id),
  )
  registro.registrar(
    CANAIS.equipamentosListarDisponiveis,
    esquemaPeriodo,
    async (periodo) => servico.listarDisponiveis(periodo),
  )
  registro.registrar(CANAIS.equipamentosCriar, esquemaEquipamentoCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.equipamentosAtualizar, esquemaEquipamentoAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.equipamentosInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  })
}
