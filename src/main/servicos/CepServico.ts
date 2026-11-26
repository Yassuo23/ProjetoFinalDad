import type { RespostaCep } from '../../shared/contratos/modelos'
import { ClienteHttp, HOSTS } from './integracoes/ClienteHttp'
import { ErroNaoEncontrado, motivoIntegracao } from './integracoes/ErroIntegracao'
import { esquemaRespostaViaCep } from './integracoes/esquemasExternos'
import type { ServicoCep } from './portas'

/** Endereço é estável: 24 h de cache (ADR 0008). */
const TTL_CEP_MS = 24 * 60 * 60 * 1000

function textoOuNulo(valor: string | undefined): string | null {
  if (valor === undefined) return null
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export class CepServico implements ServicoCep {
  constructor(private readonly http: ClienteHttp = new ClienteHttp()) {}

  /**
   * Padrão das demais integrações: falha upstream é RETORNO tipado, nunca
   * exceção. CEP inexistente (`nao-encontrado`) não se confunde com serviço
   * fora/resposta inválida (`indisponivel`, com `motivo`).
   */
  async consultar(cep: string): Promise<RespostaCep> {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) {
      return { estado: 'nao-encontrado', cep: digitos }
    }

    // Host fixo; o renderer informa somente os dígitos, nunca uma URL.
    const url = new URL(`/ws/${encodeURIComponent(digitos)}/json/`, HOSTS.viacep)

    try {
      const dados = await this.http.obter(url, esquemaRespostaViaCep, TTL_CEP_MS)
      if (dados.erro === true) {
        return { estado: 'nao-encontrado', cep: digitos }
      }
      return {
        estado: 'disponivel',
        endereco: {
          cep: digitos,
          logradouro: textoOuNulo(dados.logradouro),
          bairro: textoOuNulo(dados.bairro),
          cidade: textoOuNulo(dados.localidade),
          uf: textoOuNulo(dados.uf),
        },
      }
    } catch (erro) {
      // Nunca expõe status HTTP, URL, stack nem detalhe do fetch ao renderer.
      if (erro instanceof ErroNaoEncontrado) {
        return { estado: 'nao-encontrado', cep: digitos }
      }
      return { estado: 'indisponivel', cep: digitos, motivo: motivoIntegracao(erro) }
    }
  }

  /** Nome adotado pela porta de clientes; retorna o mesmo contrato de `consultar`. */
  buscar(cep: string): Promise<RespostaCep> {
    return this.consultar(cep)
  }
}
