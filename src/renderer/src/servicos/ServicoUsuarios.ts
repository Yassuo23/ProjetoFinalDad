import type {
  UsuarioAlterarSenhaEntrada,
  UsuarioAtualizarEntrada,
  UsuarioCriarEntrada,
  UsuarioListarFiltros,
  UsuarioPublico,
} from '../../../shared/contratos/modelos'
import { vigiarSessao } from './VigilanciaSessao'

/**
 * Única ponte do renderer com `usuarios:*`. O main autoriza somente
 * administradores; aqui não há senha em texto puro nem hash em memória.
 */
export class ServicoUsuarios {
  listar(filtros?: UsuarioListarFiltros): Promise<UsuarioPublico[]> {
    return vigiarSessao(window.electronAPI.usuarios.listar(filtros))
  }

  criar(dados: UsuarioCriarEntrada): Promise<UsuarioPublico> {
    return vigiarSessao(window.electronAPI.usuarios.criar(dados))
  }

  atualizar(dados: UsuarioAtualizarEntrada): Promise<UsuarioPublico> {
    return vigiarSessao(window.electronAPI.usuarios.atualizar(dados))
  }

  alterarSenha(dados: UsuarioAlterarSenhaEntrada): Promise<void> {
    return vigiarSessao(window.electronAPI.usuarios.alterarSenha(dados))
  }
}
