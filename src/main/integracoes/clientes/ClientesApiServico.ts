import type { Cliente, ListarClientesRequisicao } from '../../../shared/contratos/modelos'
import type { ConfiguracaoApiClientes } from './configuracao'
import { ErroApiClientes, erroPorStatusHttpClientes, normalizarErroApiClientes } from './erros'
import { analisarRespostaClientes } from './tipos'

/** `typeof fetch` mantém a porta de rede injetável nos testes. */
type ClienteHttp = typeof fetch

/**
 * Único ponto de acesso HTTP à API de clientes. Roda no main: o renderer nunca
 * vê URL base, token nem a resposta crua da API.
 */
export class ClientesApiServico {
  constructor(
    private readonly configuracao: ConfiguracaoApiClientes,
    private readonly http: ClienteHttp = (entrada, init) => fetch(entrada, init),
  ) {}

  async listar(requisicao: ListarClientesRequisicao = {}): Promise<Cliente[]> {
    const url = new URL('/clientes', this.configuracao.urlBase)
    if (requisicao.busca !== undefined && requisicao.busca.trim() !== '') {
      url.searchParams.set('q', requisicao.busca.trim())
    }
    if (requisicao.limite !== undefined) {
      url.searchParams.set('limite', String(requisicao.limite))
    }

    // "Interceptor" de autenticação: o token nunca é montado no renderer.
    const cabecalhos = new Headers({ Accept: 'application/json' })
    if (this.configuracao.token !== undefined) {
      cabecalhos.set('Authorization', `Bearer ${this.configuracao.token}`)
    }

    try {
      const resposta = await this.http(url, {
        method: 'GET',
        headers: cabecalhos,
        signal: AbortSignal.timeout(this.configuracao.timeoutMs),
      })

      if (!resposta.ok) {
        throw erroPorStatusHttpClientes(resposta.status)
      }

      let bruto: unknown
      try {
        bruto = await resposta.json()
      } catch {
        throw new ErroApiClientes(
          'RESPOSTA_INVALIDA',
          'O serviço de clientes devolveu uma resposta inesperada. Tente novamente.',
        )
      }
      return analisarRespostaClientes(bruto)
    } catch (erro) {
      throw normalizarErroApiClientes(erro)
    }
  }
}
