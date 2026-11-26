import { vigiarSessao } from './VigilanciaSessao'
import type {
  FeriadosEntrada,
  PrevisaoTempoEntrada,
  RespostaCnpj,
  RespostaFeriados,
  RespostaPrevisaoTempo,
} from '../../../shared/contratos/modelos'

/**
 * Integrações externas ficam atrás da API tipada. O renderer não conhece hosts,
 * chaves, URLs nem canais; indisponibilidade é valor de retorno do main.
 */
export class ServicoIntegracoes {
  previsaoTempo(entrada: PrevisaoTempoEntrada): Promise<RespostaPrevisaoTempo> {
    return vigiarSessao(window.electronAPI.integracoes.previsaoTempo(entrada))
  }

  cnpj(cnpj: string): Promise<RespostaCnpj> {
    return vigiarSessao(window.electronAPI.integracoes.cnpj(cnpj))
  }

  feriados(entrada: FeriadosEntrada): Promise<RespostaFeriados> {
    return vigiarSessao(window.electronAPI.integracoes.feriados(entrada))
  }
}
