import { describe, expect, it, vi } from 'vitest'
import { CnpjServico } from './CnpjServico'
import { ClienteHttp } from './integracoes/ClienteHttp'

const CNPJ = '11.444.777/0001-61'
const DIGITOS = '11444777000161'

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function dadosBrasilApi(): unknown {
  return {
    cnpj: DIGITOS,
    razao_social: 'Z R DE BRITO EMPREITEIRA',
    nome_fantasia: '',
    situacao_cadastral: 4,
    cnae_fiscal_descricao: 'Construção de edifícios',
    logradouro: '',
    numero: '10',
    complemento: null,
    bairro: 'VILA OLIVEIRA',
    municipio: 'JARDINOPOLIS',
    uf: 'SP',
    cep: '14680000',
  }
}

describe('CnpjServico', () => {
  it('valida os dígitos e mapeia dados e endereço aditivo', async () => {
    const buscar = vi.fn(async (_url: URL, _init?: RequestInit) => resposta(dadosBrasilApi()))
    const resultado = await new CnpjServico(new ClienteHttp(buscar)).consultar(CNPJ)

    expect(resultado).toMatchObject({
      estado: 'disponivel',
      dados: {
        cnpj: DIGITOS,
        razaoSocial: 'Z R DE BRITO EMPREITEIRA',
        nomeFantasia: null,
        situacao: 'Baixada',
        atividadePrincipal: 'Construção de edifícios',
        numero: '10',
        bairro: 'VILA OLIVEIRA',
        cidade: 'JARDINOPOLIS',
        uf: 'SP',
        cep: '14680000',
      },
    })
    const [url, init] = buscar.mock.calls[0] as [URL, RequestInit | undefined]
    expect(url.origin).toBe('https://brasilapi.com.br')
    expect(url.pathname).toBe(`/api/cnpj/v1/${DIGITOS}`)
    expect(init?.signal).toBeDefined()
  })

  it('recusa dígitos verificadores inválidos sem consultar a rede', async () => {
    const buscar = vi.fn(async () => resposta(dadosBrasilApi()))
    const resultado = await new CnpjServico(new ClienteHttp(buscar)).consultar('11111111111111')

    expect(resultado).toMatchObject({ estado: 'indisponivel', motivo: 'PESQUISA_INVALIDA' })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('traduz 404 e schema inválido em SEM_DADOS sem repetir', async () => {
    const naoEncontrado = vi.fn(async () => resposta({ message: 'not found' }, 404))
    expect(
      await new CnpjServico(new ClienteHttp(naoEncontrado)).consultar(CNPJ),
    ).toMatchObject({ estado: 'indisponivel', motivo: 'SEM_DADOS' })
    expect(naoEncontrado).toHaveBeenCalledTimes(1)

    const invalido = vi.fn(async () => resposta({ razao_social: '' }))
    expect(await new CnpjServico(new ClienteHttp(invalido)).consultar(CNPJ)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(invalido).toHaveBeenCalledTimes(1)
  })

  it('faz uma nova tentativa em 5xx e em timeout', async () => {
    const servidorFora = vi.fn(async () => resposta({}, 500))
    expect(
      await new CnpjServico(new ClienteHttp(servidorFora)).consultar(CNPJ),
    ).toMatchObject({ estado: 'indisponivel', motivo: 'SERVICO_FORA' })
    expect(servidorFora).toHaveBeenCalledTimes(2)

    const timeout = vi.fn(async () => {
      throw new Error('abortado')
    })
    expect(await new CnpjServico(new ClienteHttp(timeout)).consultar(CNPJ)).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SERVICO_FORA',
    })
    expect(timeout).toHaveBeenCalledTimes(2)
  })

  it('reutiliza o cache e não devolve erro bruto', async () => {
    const buscar = vi.fn(async () => resposta(dadosBrasilApi()))
    const servico = new CnpjServico(new ClienteHttp(buscar))

    const primeiro = await servico.consultar(CNPJ)
    const segundo = await servico.consultar(DIGITOS)

    expect(primeiro).toEqual(segundo)
    expect(buscar).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(primeiro)).not.toContain('status')
  })
})
