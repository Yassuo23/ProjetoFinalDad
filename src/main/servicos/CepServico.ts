import type { EnderecoCep } from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDeDominio'
import { ClienteHttp, HOSTS } from './integracoes/ClienteHttp'
import { mensagemIntegracao } from './integracoes/ErroIntegracao'
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

  async buscar(cep: string): Promise<EnderecoCep> {
    const digitos = cep.replace(/\D/g, '')
    if (digitos.length !== 8) {
      throw new ErroDeDominio('CEP_INVALIDO', 'CEP inválido. Informe os 8 dígitos.')
    }

    // Host fixo; o renderer informa somente os dígitos, nunca uma URL.
    const url = new URL(`/ws/${encodeURIComponent(digitos)}/json/`, HOSTS.viacep)

    try {
      const dados = await this.http.obter(url, esquemaRespostaViaCep, TTL_CEP_MS)
      return {
        cep: digitos,
        logradouro: textoOuNulo(dados.logradouro),
        bairro: textoOuNulo(dados.bairro),
        cidade: textoOuNulo(dados.localidade),
        uf: textoOuNulo(dados.uf),
      }
    } catch (erro) {
      // Nunca expõe status HTTP, URL, stack nem detalhe do fetch ao renderer.
      throw new ErroDeDominio('CEP_INVALIDO', mensagemIntegracao(erro))
    }
  }
}
