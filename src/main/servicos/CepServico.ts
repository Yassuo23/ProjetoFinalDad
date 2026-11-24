import type { Endereco } from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoCep {
  consultar(cep: string): Promise<Endereco>
}

interface MapaCampos {
  logradouro: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

const CAMPOS_VIACEP: MapaCampos = {
  logradouro: 'logradouro',
  complemento: 'complemento',
  bairro: 'bairro',
  cidade: 'localidade',
  uf: 'uf',
}

const CAMPOS_BRASILAPI: MapaCampos = {
  logradouro: 'street',
  complemento: 'complement',
  bairro: 'neighborhood',
  cidade: 'city',
  uf: 'state',
}

/**
 * Consulta de CEP no processo principal: ViaCEP primeiro, BrasilAPI como fallback.
 * Nenhum erro de rede ou de JSON cruza para o handler — só códigos de domínio.
 */
export class CepServico implements ServicoCep {
  async consultar(cep: string): Promise<Endereco> {
    const digitos = cep.replace(/\D/g, '')
    if (!/^\d{8}$/.test(digitos)) {
      throw new ErroDeDominio('CEP_INVALIDO', 'CEP inválido.')
    }

    const viaCep = converter(
      await buscarJson(`https://viacep.com.br/ws/${digitos}/json/`),
      digitos,
      CAMPOS_VIACEP,
    )
    if (viaCep) return viaCep

    const brasilApi = converter(
      await buscarJson(`https://brasilapi.com.br/api/cep/v1/${digitos}`),
      digitos,
      CAMPOS_BRASILAPI,
    )
    if (brasilApi) return brasilApi

    throw new ErroDeDominio('CEP_NAO_ENCONTRADO', 'CEP não encontrado.')
  }
}

async function buscarJson(url: string): Promise<unknown> {
  try {
    const resposta = await fetch(url)
    if (!resposta.ok) return null
    const dados: unknown = await resposta.json()
    return dados
  } catch {
    return null
  }
}

function ehObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function texto(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function converter(dados: unknown, cep: string, campos: MapaCampos): Endereco | null {
  if (!ehObjeto(dados) || dados.erro === true || dados.error) return null

  const logradouro = texto(dados[campos.logradouro])
  const cidade = texto(dados[campos.cidade])
  const uf = texto(dados[campos.uf]).toUpperCase()
  if (!logradouro && !cidade && !uf) return null

  return {
    cep,
    logradouro,
    complemento: texto(dados[campos.complemento]),
    bairro: texto(dados[campos.bairro]),
    cidade,
    uf,
  }
}
