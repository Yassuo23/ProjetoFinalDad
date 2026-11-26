import { CANAIS } from '../../../shared/contratos/canais'
import {
  esquemaIntegracaoCnpj,
  esquemaIntegracaoFeriados,
  esquemaIntegracaoPrevisaoTempo,
} from '../../../shared/contratos/esquemas'
import type { ServicoCnpj, ServicoFeriados, ServicoPrevisaoTempo } from '../../servicos/portas'
import { PERFIS, type RegistroIpc } from '../RegistroIpc'

export interface IntegracoesDoMain {
  readonly previsaoTempo: ServicoPrevisaoTempo
  readonly cnpj: ServicoCnpj
  readonly feriados: ServicoFeriados
}

/** Handlers finos: validam payload e delegam; regra e HTTP ficam no serviço. */
export function registrarIntegracoes(registro: RegistroIpc, servicos: IntegracoesDoMain): void {
  registro.registrar(
    CANAIS.integracoesPrevisaoTempo,
    esquemaIntegracaoPrevisaoTempo,
    async ({ data }) => servicos.previsaoTempo.consultar(data),
    PERFIS.autenticados,
  )
  registro.registrar(
    CANAIS.integracoesCnpj,
    esquemaIntegracaoCnpj,
    async ({ cnpj }) => servicos.cnpj.consultar(cnpj),
    PERFIS.admin,
  )
  registro.registrar(
    CANAIS.integracoesFeriados,
    esquemaIntegracaoFeriados,
    async ({ ano }) => servicos.feriados.feriados(ano),
    PERFIS.autenticados,
  )
}
