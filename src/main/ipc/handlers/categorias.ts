import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaCategoriaAtualizar,
  esquemaCategoriaCriar,
  esquemaCategoriaListar,
  esquemaId,
} from '../../../shared/contratos/esquemas'
import type { ServicoCategorias } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarCategorias(registro: RegistroIpc, servico: ServicoCategorias): void {
  registro.registrar(
    CANAIS.categoriasListar,
    esquemaCategoriaListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.categoriasBuscarPorId,
    esquemaId,
    async ({ id }) => servico.buscarPorId(id),
    PERFIS.ambos,
  )
  registro.registrar(
    CANAIS.categoriasCriar,
    esquemaCategoriaCriar,
    async (dados) => servico.criar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.categoriasAtualizar,
    esquemaCategoriaAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.admin,
  )
  registro.registrar(CANAIS.categoriasInativar, esquemaId, async ({ id }) => {
    await servico.inativar(id)
  }, PERFIS.admin)
}
