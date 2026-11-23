import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CodigoErroDominio } from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'
import { CepServico } from './CepServico'

afterEach(() => {
  vi.unstubAllGlobals()
})

function respostaJson(dados: unknown, status = 200): Response {
  return Response.json(dados, { status })
}

async function codigoDaRejeicao(acao: () => Promise<unknown>): Promise<CodigoErroDominio> {
  try {
    await acao()
  } catch (erro) {
    if (erro instanceof ErroDeDominio) {
      expect(erro.message).toBe(erro.codigo)
      return erro.codigo
    }
    throw erro
  }
  throw new Error('Era esperado um erro de domínio')
}

describe('CepServico', () => {
  it('normaliza o CEP e usa o ViaCEP como fonte primária', async () => {
    const buscar = vi.fn(async (url: string): Promise<Response> => {
      expect(url).toBe('https://viacep.com.br/ws/01001000/json/')
      return respostaJson({
        cep: '01001-000',
        logradouro: ' Praça da Sé ',
        complemento: 'lado ímpar',
        bairro: 'Sé',
        localidade: 'São Paulo',
        uf: 'sp',
      })
    })
    vi.stubGlobal('fetch', buscar)

    await expect(new CepServico().consultar('01001-000')).resolves.toEqual({
      cep: '01001000',
      logradouro: 'Praça da Sé',
      complemento: 'lado ímpar',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('usa a BrasilAPI quando o ViaCEP não encontra o CEP', async () => {
    const buscar = vi.fn(async (url: string): Promise<Response> => {
      if (url.startsWith('https://viacep.com.br/')) return respostaJson({ erro: true })
      expect(url).toBe('https://brasilapi.com.br/api/cep/v1/01001000')
      return respostaJson({
        cep: '01001000',
        street: 'Praça da Sé',
        complement: '',
        neighborhood: 'Sé',
        city: 'São Paulo',
        state: 'SP',
      })
    })
    vi.stubGlobal('fetch', buscar)

    await expect(new CepServico().consultar('01001000')).resolves.toMatchObject({
      logradouro: 'Praça da Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('devolve CEP_NAO_ENCONTRADO quando nenhuma fonte conhece o CEP', async () => {
    const buscar = vi.fn(async (url: string): Promise<Response> =>
      url.startsWith('https://viacep.com.br/')
        ? respostaJson({ erro: true })
        : respostaJson({ error: 'not found' }, 404),
    )
    vi.stubGlobal('fetch', buscar)

    expect(await codigoDaRejeicao(() => new CepServico().consultar('00000-000'))).toBe(
      'CEP_NAO_ENCONTRADO',
    )
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('não vaza erro de rede: falha nos dois provedores vira código de domínio', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => {
      throw new Error('ECONNRESET')
    })
    vi.stubGlobal('fetch', buscar)

    expect(await codigoDaRejeicao(() => new CepServico().consultar('01001000'))).toBe(
      'CEP_NAO_ENCONTRADO',
    )
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('rejeita CEP inválido sem chamar nenhum provedor', async () => {
    const buscar = vi.fn(async (_url: string): Promise<Response> => respostaJson({}))
    vi.stubGlobal('fetch', buscar)

    expect(await codigoDaRejeicao(() => new CepServico().consultar('abc'))).toBe('CEP_INVALIDO')
    expect(buscar).not.toHaveBeenCalled()
  })
})
