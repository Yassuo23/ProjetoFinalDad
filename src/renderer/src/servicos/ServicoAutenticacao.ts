import type {
  AutenticarEntrada,
  BootstrapEntrada,
  CadastrarClienteEntrada,
  EstadoSessao,
  Sessao,
} from '../../../shared/contratos/modelos'

/**
 * Única ponte do renderer com `auth:*`. Nenhuma string de canal, nenhum
 * armazenamento local e nenhum segredo em log: apenas `window.electronAPI.auth`.
 */
export class ServicoAutenticacao {
  sessaoAtual(): Promise<EstadoSessao> {
    return window.electronAPI.auth.sessaoAtual()
  }

  entrar(dados: AutenticarEntrada): Promise<Sessao> {
    return window.electronAPI.auth.entrar(dados)
  }

  bootstrap(dados: BootstrapEntrada): Promise<Sessao> {
    return window.electronAPI.auth.bootstrap(dados)
  }

  /** Auto-cadastro público: o payload não contém `perfil`. */
  cadastrarCliente(dados: CadastrarClienteEntrada): Promise<Sessao> {
    return window.electronAPI.auth.cadastrarCliente(dados)
  }

  sair(): Promise<void> {
    return window.electronAPI.auth.sair()
  }
}
