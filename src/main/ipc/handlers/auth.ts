import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaAuthBootstrap,
  esquemaAuthEntrar,
  esquemaCadastroCliente,
  esquemaSemEntrada,
} from '../../../shared/contratos/esquemas'
import type { ServicoAutenticacao } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/**
 * Handlers finos de autenticação. A sessão permanece no main; o renderer recebe
 * somente `Sessao`/`EstadoSessao`, sem hash ou senha.
 */
export function registrarAutenticacao(registro: RegistroIpc, servico: ServicoAutenticacao): void {
  registro.registrar(
    CANAIS.authEntrar,
    esquemaAuthEntrar,
    async (dados) => servico.entrar(dados),
    PERFIS.publico,
  )
  registro.registrar(
    CANAIS.authSessaoAtual,
    esquemaSemEntrada,
    async () => servico.sessaoAtual(),
    PERFIS.publico,
  )
  registro.registrar(CANAIS.authBootstrap, esquemaAuthBootstrap, async (dados) => {
    return servico.bootstrap(dados)
  }, PERFIS.anonimo)
  // ADR 0009: schema strict barra `perfil`; o serviço fixa 'Cliente' e exige
  // administrador ativo antes de criar a identidade.
  registro.registrar(
    CANAIS.authCadastrarCliente,
    esquemaCadastroCliente,
    async (dados) => servico.cadastrarCliente(dados),
    PERFIS.anonimo,
  )
  registro.registrar(CANAIS.authSair, esquemaSemEntrada, async () => {
    servico.sair()
  }, PERFIS.autenticados)
}
