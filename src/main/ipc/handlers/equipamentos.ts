import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaEquipamentoAtualizar,
  esquemaEquipamentoBuscarPorId,
  esquemaEquipamentoCriar,
  esquemaEquipamentoInativar,
  esquemaEquipamentoListar,
  esquemaEquipamentoListarDisponiveis,
  esquemaVerificarDisponibilidade,
} from '../../../shared/contratos/esquemas'
import type { ServicoDisponibilidade } from '../../servicos/DisponibilidadeServico'
import type { ServicoEquipamentos } from '../../servicos/EquipamentoServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: validam pelo schema e delegam. Nenhuma regra nem SQL aqui. */
export function registrarEquipamentos(
  registro: RegistroIpc,
  servico: ServicoEquipamentos,
  disponibilidade: ServicoDisponibilidade,
): void {
  registro.registrar(CANAIS.equipamentosListar, esquemaEquipamentoListar, async (filtros) =>
    servico.listar(filtros ?? {}),
  )

  registro.registrar(
    CANAIS.equipamentosBuscarPorId,
    esquemaEquipamentoBuscarPorId,
    async ({ id }) => servico.buscarPorId(id),
  )

  registro.registrar(CANAIS.equipamentosCriar, esquemaEquipamentoCriar, async (dados) =>
    servico.criar(dados),
  )

  registro.registrar(CANAIS.equipamentosAtualizar, esquemaEquipamentoAtualizar, async (dados) =>
    servico.atualizar(dados),
  )

  registro.registrar(
    CANAIS.equipamentosInativar,
    esquemaEquipamentoInativar,
    async ({ id }) => {
      servico.inativar(id)
    },
  )

  registro.registrar(
    CANAIS.equipamentosListarDisponiveis,
    esquemaEquipamentoListarDisponiveis,
    async (periodo) => servico.listarDisponiveis(periodo),
  )

  registro.registrar(
    CANAIS.equipamentosVerificarDisponibilidade,
    esquemaVerificarDisponibilidade,
    async (entrada) => disponibilidade.verificar(entrada),
  )
}
