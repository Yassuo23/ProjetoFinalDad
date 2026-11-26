import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaResumoDashboard } from '../../../shared/contratos/esquemas'
import type { ProvedorSessao, ServicoDashboard } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

/** O perfil vem da sessão do main: atendente nunca recebe `financeiro`. */
export function registrarDashboard(
  registro: RegistroIpc,
  servico: ServicoDashboard,
  sessao: ProvedorSessao,
): void {
  registro.registrar(
    CANAIS.dashboardResumo,
    esquemaResumoDashboard,
    async (entrada) => servico.resumo(entrada, sessao.sessao()?.perfil),
    PERFIS.ambos,
  )
}
