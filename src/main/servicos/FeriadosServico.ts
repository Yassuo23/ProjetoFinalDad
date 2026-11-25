import type { RespostaFeriados } from '../../shared/contratos/modelos'
import { ClienteHttp, HOSTS } from './integracoes/ClienteHttp'
import { motivoIntegracao } from './integracoes/ErroIntegracao'
import { esquemaRespostaFeriados } from './integracoes/esquemasExternos'
import type { ServicoFeriados } from './portas'

/** O ano é estável; 24 h de cache (ADR 0008). */
const TTL_FERIADOS_MS = 24 * 60 * 60 * 1000
const ANO_MINIMO = 2020
const ANO_MAXIMO = 2100

export class FeriadosServico implements ServicoFeriados {
  constructor(private readonly http: ClienteHttp = new ClienteHttp()) {}

  async feriados(ano: number): Promise<RespostaFeriados> {
    if (!Number.isInteger(ano) || ano < ANO_MINIMO || ano > ANO_MAXIMO) {
      return { estado: 'indisponivel', ano, motivo: 'PESQUISA_INVALIDA', feriados: [] }
    }

    const url = new URL(`/api/feriados/v1/${encodeURIComponent(String(ano))}`, HOSTS.brasilApi)
    try {
      const dados = await this.http.obter(url, esquemaRespostaFeriados, TTL_FERIADOS_MS)
      const feriados = dados
        .filter((item) => item.type === 'national')
        .map((item) => ({ data: item.date, nome: item.name }))
        .sort((a, b) => a.data.localeCompare(b.data))
      return { estado: 'disponivel', ano, feriados }
    } catch (erro) {
      return { estado: 'indisponivel', ano, motivo: motivoIntegracao(erro), feriados: [] }
    }
  }
}
