import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaUsuarioAlterarSenha,
  esquemaUsuarioAtualizar,
  esquemaUsuarioCriar,
  esquemaUsuarioListar,
} from '../../../shared/contratos/esquemas'
import type { ServicoUsuarios } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** Usuários: operações exclusivas de administrador, validadas antes de delegar. */
export function registrarUsuarios(registro: RegistroIpc, servico: ServicoUsuarios): void {
  registro.registrar(
    CANAIS.usuariosListar,
    esquemaUsuarioListar,
    async (filtros) => servico.listar(filtros),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.usuariosCriar,
    esquemaUsuarioCriar,
    async (dados) => servico.criar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.usuariosAtualizar,
    esquemaUsuarioAtualizar,
    async (dados) => servico.atualizar(dados),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.usuariosAlterarSenha,
    esquemaUsuarioAlterarSenha,
    async (dados) => servico.alterarSenha(dados),
    PERFIS.admin,
  )
}
