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
    return window.electronAPI.integracoes.previsaoTempo(entrada)
  }

  cnpj(cnpj: string): Promise<RespostaCnpj> {
    return window.electronAPI.integracoes.cnpj(cnpj)
  }

  feriados(entrada: FeriadosEntrada): Promise<RespostaFeriados> {
    return window.electronAPI.integracoes.feriados(entrada)
  }
}
