import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaClienteAtualizar,
  esquemaClienteBuscarPorId,
  esquemaClienteCriar,
  esquemaClienteInativar,
  esquemaClienteListar,
  esquemaConsultarCep,
} from '../../../shared/contratos/esquemas'
import type { ServicoCep } from '../../servicos/CepServico'
import type { ServicoClientes } from '../../servicos/ClienteServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: validam pelo schema e delegam. Nenhuma regra nem SQL aqui. */
export function registrarClientes(
  registro: RegistroIpc,
  clientes: ServicoClientes,
  servicoCep: ServicoCep,
): void {
  registro.registrar(CANAIS.clientesListar, esquemaClienteListar, async (filtros) =>
    clientes.listar(filtros ?? {}),
  )

  registro.registrar(
    CANAIS.clientesBuscarPorId,
    esquemaClienteBuscarPorId,
    async ({ id }) => clientes.buscarPorId(id),
  )

  registro.registrar(CANAIS.clientesCriar, esquemaClienteCriar, async (dados) =>
    clientes.criar(dados),
  )

  registro.registrar(CANAIS.clientesAtualizar, esquemaClienteAtualizar, async (dados) =>
    clientes.atualizar(dados),
  )

  registro.registrar(CANAIS.clientesInativar, esquemaClienteInativar, async ({ id }) => {
    clientes.inativar(id)
  })

  registro.registrar(CANAIS.clientesConsultarCep, esquemaConsultarCep, async ({ cep }) =>
    servicoCep.consultar(cep),
  )
}
