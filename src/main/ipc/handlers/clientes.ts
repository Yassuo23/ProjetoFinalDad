import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaBuscarCep,
  esquemaClienteAtualizar,
  esquemaClienteCriar,
  esquemaClienteListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import { idClienteDaSessao } from '../../seguranca/EscopoCliente'
import type { ProvedorSessao, ServicoClientes } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema, deriva o dono da sessão e delega. */
export function registrarClientes(
  registro: RegistroIpc,
  servico: ServicoClientes,
  sessao: ProvedorSessao,
): void {
  registro.registrar(
    CANAIS.clientesListar,
    esquemaClienteListar,
    async (filtros) => servico.listar(filtros, idClienteDaSessao(sessao)),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.clientesBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id, idClienteDaSessao(sessao)),
    PERFIS.autenticados,
  )
  // `buscarCep` devolve a união tipada; o handler apenas delega, sem adaptar erro.
  registro.registrar(
    CANAIS.clientesBuscarCep,
    esquemaBuscarCep,
    async ({ cep }) => servico.buscarCep(cep),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.clientesCriar,
    esquemaClienteCriar,
    async (dados) => servico.criar(dados),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.clientesAtualizar,
    esquemaClienteAtualizar,
    async (dados) => servico.atualizar(dados, idClienteDaSessao(sessao)),
    PERFIS.autenticados,
  )
  registro.registrar(CANAIS.clientesInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
