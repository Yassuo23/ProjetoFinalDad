import { describe, expect, it, vi } from 'vitest'
import { CepServico } from './CepServico'
import { ClienteHttp } from './integracoes/ClienteHttp'

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('CepServico', () => {
  it('valida e mapeia o endereço, usando host fixo e timeout', async () => {
    const buscar = vi.fn(async (_url: URL, _init?: RequestInit) =>
      resposta({
        logradouro: ' Rua das Trilhas ',
        bairro: 'Centro',
        localidade: 'São Paulo',
        uf: 'SP',
      }),
    )
    const servico = new CepServico(new ClienteHttp(buscar))

    const endereco = await servico.buscar('12345-678')

    expect(endereco).toEqual({
      cep: '12345678',
      logradouro: 'Rua das Trilhas',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
    const [url, init] = buscar.mock.calls[0] as [URL, RequestInit | undefined]
    expect(url.origin).toBe('https://viacep.com.br')
    expect(url.pathname).toBe('/ws/12345678/json/')
    expect(init?.signal).toBeDefined()
  })

  it('rejeita CEP malformado sem consultar a rede', async () => {
    const buscar = vi.fn(async () => resposta({}))
    const servico = new CepServico(new ClienteHttp(buscar))

    await expect(servico.buscar('12abc')).rejects.toMatchObject({ codigo: 'CEP_INVALIDO' })
    expect(buscar).not.toHaveBeenCalled()
  })

  it('traduz 404 e erro de validação em erro amigável, sem repetir', async () => {
    const buscar = vi.fn(async () => resposta({ erro: true }, 404))
    const servico = new CepServico(new ClienteHttp(buscar))

    await expect(servico.buscar('12345678')).rejects.toMatchObject({
      codigo: 'CEP_INVALIDO',
      mensagem: 'Não encontramos dados para esta consulta.',
    })
    expect(buscar).toHaveBeenCalledTimes(1)
  })

  it('faz no máximo uma nova tentativa em 5xx e em timeout', async () => {
    const servidorFora = vi.fn(async () => resposta({}, 503))
    await expect(
      new CepServico(new ClienteHttp(servidorFora)).buscar('12345678'),
    ).rejects.toMatchObject({ codigo: 'CEP_INVALIDO' })
    expect(servidorFora).toHaveBeenCalledTimes(2)

    const timeout = vi.fn(async () => {
      throw new Error('abortado')
    })
    await expect(new CepServico(new ClienteHttp(timeout)).buscar('12345678')).rejects.toMatchObject({
      codigo: 'CEP_INVALIDO',
    })
    expect(timeout).toHaveBeenCalledTimes(2)
  })

  it('não cacheia resposta inválida', async () => {
    const buscar = vi.fn(async () => resposta({ logradouro: 42 }))
    const servico = new CepServico(new ClienteHttp(buscar))

    await expect(servico.buscar('12345678')).rejects.toMatchObject({ codigo: 'CEP_INVALIDO' })
    await expect(servico.buscar('12345678')).rejects.toMatchObject({ codigo: 'CEP_INVALIDO' })
    expect(buscar).toHaveBeenCalledTimes(2)
  })

  it('reaproveita o cache em consultas repetidas', async () => {
    const buscar = vi.fn(async () => resposta({ localidade: 'Recife', uf: 'PE' }))
    const servico = new CepServico(new ClienteHttp(buscar))

    await servico.buscar('50000000')
    await servico.buscar('50000-000')

    expect(buscar).toHaveBeenCalledTimes(1)
  })
})
