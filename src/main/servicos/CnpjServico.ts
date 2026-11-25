import type { RespostaCnpj } from '../../shared/contratos/modelos'
import { ClienteHttp, HOSTS } from './integracoes/ClienteHttp'
import { motivoIntegracao } from './integracoes/ErroIntegracao'
import { esquemaRespostaCnpj } from './integracoes/esquemasExternos'
import type { ServicoCnpj } from './portas'

/** Dados cadastrais mudam pouco; 24 h de cache (ADR 0008). */
const TTL_CNPJ_MS = 24 * 60 * 60 * 1000

const SITUACOES: Readonly<Record<number, string>> = {
  1: 'Ativa',
  2: 'Suspensa',
  3: 'Inapta',
  4: 'Baixada',
  8: 'Encerrada',
}

function digitoVerificador(base: string, pesos: readonly number[]): number {
  const soma = pesos.reduce((total, peso, indice) => total + Number(base[indice]) * peso, 0)
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}

/** Valida os dois dígitos antes de gastar uma chamada externa. */
function cnpjValido(digitos: string): boolean {
  if (!/^\d{14}$/.test(digitos) || /^(\d)\1{13}$/.test(digitos)) return false
  const primeiro = digitoVerificador(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  if (primeiro !== Number(digitos[12])) return false
  const segundo = digitoVerificador(digitos.slice(0, 13), [
    6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2,
  ])
  return segundo === Number(digitos[13])
}

function textoOuNulo(valor: string | null | undefined): string | null {
  if (valor === undefined || valor === null) return null
  const limpo = valor.trim()
  return limpo === '' ? null : limpo
}

export class CnpjServico implements ServicoCnpj {
  constructor(private readonly http: ClienteHttp = new ClienteHttp()) {}

  async consultar(cnpj: string): Promise<RespostaCnpj> {
    const digitos = cnpj.trim().replace(/\D/g, '')
    if (!cnpjValido(digitos)) {
      return { estado: 'indisponivel', cnpj: digitos, motivo: 'PESQUISA_INVALIDA' }
    }

    const url = new URL(`/api/cnpj/v1/${encodeURIComponent(digitos)}`, HOSTS.brasilApi)
    try {
      const dados = await this.http.obter(url, esquemaRespostaCnpj, TTL_CNPJ_MS)
      return {
        estado: 'disponivel',
        dados: {
          cnpj: digitos,
          razaoSocial: dados.razao_social,
          nomeFantasia: textoOuNulo(dados.nome_fantasia),
          situacao:
            dados.situacao_cadastral === null || dados.situacao_cadastral === undefined
              ? null
              : (SITUACOES[dados.situacao_cadastral] ?? `Código ${dados.situacao_cadastral}`),
          atividadePrincipal: textoOuNulo(dados.cnae_fiscal_descricao),
          logradouro: textoOuNulo(dados.logradouro),
          numero: textoOuNulo(dados.numero),
          complemento: textoOuNulo(dados.complemento),
          bairro: textoOuNulo(dados.bairro),
          cidade: textoOuNulo(dados.municipio),
          uf: textoOuNulo(dados.uf),
          cep: textoOuNulo(dados.cep),
        },
      }
    } catch (erro) {
      return { estado: 'indisponivel', cnpj: digitos, motivo: motivoIntegracao(erro) }
    }
  }
}
