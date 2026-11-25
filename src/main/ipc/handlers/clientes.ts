import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaBuscarCep,
  esquemaClienteAtualizar,
  esquemaClienteCriar,
  esquemaClienteListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import type { ServicoClientes } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarClientes(registro: RegistroIpc, servico: ServicoClientes): void {
  registro.registrar(CANAIS.clientesListar, esquemaClienteListar, async (filtros) =>
    servico.listar(filtros),
  )
  registro.registrar(CANAIS.clientesBuscarPorId, esquemaId, async ({ id }) =>
    servico.buscarPorId(id),
  )
  registro.registrar(CANAIS.clientesBuscarCep, esquemaBuscarCep, async ({ cep }) =>
    servico.buscarCep(cep),
  )
  registro.registrar(CANAIS.clientesCriar, esquemaClienteCriar, async (dados) =>
    servico.criar(dados),
  )
  registro.registrar(CANAIS.clientesAtualizar, esquemaClienteAtualizar, async (dados) =>
    servico.atualizar(dados),
  )
  registro.registrar(CANAIS.clientesInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  })
}
