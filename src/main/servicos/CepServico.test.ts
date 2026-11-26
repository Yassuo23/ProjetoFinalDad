import { describe, expect, it, vi } from 'vitest'
import { CepServico } from './CepServico'
import { ClienteHttp } from './integracoes/ClienteHttp'

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

const ENDERECO = {
  cep: '12345678',
  logradouro: 'Rua das Trilhas',
  bairro: 'Centro',
  cidade: 'São Paulo',
  uf: 'SP',
}

describe('CepServico.consultar — retorno tipado', () => {
  it('preenche o endereço com host fixo, cabeçalhos e timeout', async () => {
    const buscar = vi.fn(async (_url: URL, _init?: RequestInit) =>
      resposta({
        logradouro: ' Rua das Trilhas ',
        bairro: 'Centro',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    )
    const servico = new CepServico(new ClienteHttp(buscar))

    const resultado = await servico.consultar('12345-678')

    expect(resultado).toEqual({ estado: 'disponivel', endereco: ENDERECO })
    expect(buscar).toHaveBeenCalledTimes(1)
    const [url, init] = buscar.mock.calls[0] as [URL, RequestInit | undefined]
    expect(url.origin).toBe('https://viacep.com.br')
    expect(url.pathname).toBe('/ws/12345678/json/')
    expect(init?.signal).toBeDefined()
    expect(init?.headers).toMatchObject({
      'User-Agent': 'Zenite/0.1',
      Accept: 'application/json',
    })
  })

  it('devolve nao-encontrado para CEP malformado sem consultar a rede', async () => {
    const buscar = vi.fn(async () => resposta({}))
    const servico = new CepServico(new ClienteHttp(buscar))

    expect(await servico.consultar('12abc')).toEqual({
      estado: 'nao-encontrado',
      cep: '12',
    })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('devolve nao-encontrado para { erro: true } do ViaCEP, sem repetir', async () => {
    const buscar = vi.fn(async () => resposta({ erro: true }))
    const servico = new CepServico(new ClienteHttp(buscar))

    expect(await servico.consultar('12345678')).toEqual({
      estado: 'nao-encontrado',
      cep: '12345678',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('devolve nao-encontrado para 404, sem repetir', async () => {
    const buscar = vi.fn(async () => resposta({ erro: true }, 404))
    const servico = new CepServico(new ClienteHttp(buscar))

    expect(await servico.consultar('12345678')).toEqual({
      estado: 'nao-encontrado',
      cep: '12345678',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('devolve indisponivel para 403 e para corpo inválido, sem repetir', async () => {
    const proibido = vi.fn(async () => resposta({ message: 'Forbidden' }, 403))
    expect(await new CepServico(new ClienteHttp(proibido)).consultar('12345678')).toMatchObject({
      estado: 'indisponivel',
      cep: '12345678',
      motivo: 'SEM_DADOS',
    })
    expect(proibido).toHaveBeenCalledTimes(1)

    const invalido = vi.fn(async () => resposta({ logradouro: 42 }))
    const servico = new CepServico(new ClienteHttp(invalido))
    expect(await servico.consultar('12345678')).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(await servico.consultar('12345678')).toMatchObject({
      estado: 'indisponivel',
      motivo: 'SEM_DADOS',
    })
    expect(invalido).toHaveBeenCalledTimes(2)
  })

  it('devolve indisponivel (sem lançar) em 5xx e timeout, com no máximo 1 retry', async () => {
    const servidorFora = vi.fn(async () => resposta({}, 503))
    expect(
      await new CepServico(new ClienteHttp(servidorFora)).consultar('12345678'),
    ).toMatchObject({ estado: 'indisponivel', motivo: 'SERVICO_FORA' })
    expect(servidorFora).toHaveBeenCalledTimes(2)

    const timeout = vi.fn(async () => {
      throw new Error('abortado')
    })
    expect(
      await new CepServico(new ClienteHttp(timeout)).consultar('12345678'),
    ).toMatchObject({ estado: 'indisponivel', motivo: 'SERVICO_FORA' })
    expect(timeout).toHaveBeenCalledTimes(2)
  })

  it('reaproveita o cache e não cacheia falha', async () => {
    const buscar = vi.fn(async () => resposta({ localidade: 'Recife', uf: 'PE' }))
    const servico = new CepServico(new ClienteHttp(buscar))

    await servico.consultar('50000000')
    await servico.consultar('50000-000')
    expect(buscar).toHaveBeenCalledTimes(1)
  })
})

describe('CepServico.buscar — mesma união do contrato público', () => {
  it('devolve disponivel com EnderecoCep no sucesso', async () => {
    const buscar = vi.fn(async () => resposta({ localidade: 'São Paulo', uf: 'SP' }))
    const resultado = await new CepServico(new ClienteHttp(buscar)).buscar('12345-678')

    expect(resultado).toEqual({
      estado: 'disponivel',
      endereco: { ...ENDERECO, logradouro: null, bairro: null },
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('devolve nao-encontrado sem lançar ErroDeDominio', async () => {
    const buscar = vi.fn(async () => resposta({ erro: true }))
    const resultado = await new CepServico(new ClienteHttp(buscar)).buscar('12345678')

    expect(resultado).toEqual({ estado: 'nao-encontrado', cep: '12345678' })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('devolve indisponivel com motivo sem lançar ErroDeDominio', async () => {
    const buscar = vi.fn(async () => resposta({}, 503))
    const resultado = await new CepServico(new ClienteHttp(buscar)).buscar('12345678')

    expect(resultado).toMatchObject({
      estado: 'indisponivel',
      cep: '12345678',
      motivo: 'SERVICO_FORA',
    })
    expect(buscar).toHaveBeenCalledTimes(2)
  })
})
