import type { EnderecoCep } from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDeDominio'
import type { ServicoCep } from './portas'

const CEP_INVALIDO = (): ErroDeDominio =>
  new ErroDeDominio('CEP_INVALIDO', 'CEP inválido.')

function sinalTimeout(): AbortSignal | undefined {
  const construtor = AbortSignal as typeof AbortSignal & {
    readonly timeout?: (milissegundos: number) => AbortSignal
  }
  return typeof construtor.timeout === 'function' ? construtor.timeout(5000) : undefined
}

function textoOuNulo(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export class CepServico implements ServicoCep {
  async buscar(cep: string): Promise<EnderecoCep> {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) throw CEP_INVALIDO()

    // URL fixa: o renderer informa apenas o CEP, nunca um endereço.
    const url = `https://viacep.com.br/ws/${digitos}/json/`

    try {
      const sinal = sinalTimeout()
      const resposta = await (sinal === undefined ? fetch(url) : fetch(url, { signal: sinal }))
      if (!resposta.ok) throw CEP_INVALIDO()

      const corpo: unknown = await resposta.json()
      if (typeof corpo !== 'object' || corpo === null) throw CEP_INVALIDO()

      const dados = corpo as {
        erro?: unknown
        logradouro?: unknown
        bairro?: unknown
        localidade?: unknown
        uf?: unknown
      }
      if (dados.erro === true) throw CEP_INVALIDO()

      return {
        cep: digitos,
        logradouro: textoOuNulo(dados.logradouro),
        bairro: textoOuNulo(dados.bairro),
        cidade: textoOuNulo(dados.localidade),
        uf: textoOuNulo(dados.uf),
      }
    } catch (erro) {
      if (erro instanceof ErroDeDominio) throw erro
      // Nunca expõe detalhes do fetch (URL, status, stack) ao renderer.
      throw new ErroDeDominio('CEP_INVALIDO', 'Não foi possível consultar o CEP informado.')
    }
  }
}
