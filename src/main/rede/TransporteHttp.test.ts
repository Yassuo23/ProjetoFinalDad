import { describe, expect, it, vi } from 'vitest'
import { ErroSemPermissao } from '../nucleo/erros'
import { TransporteHttp, type RespostaRede } from './TransporteHttp'

function resposta(parcial: Partial<RespostaRede> = {}): RespostaRede {
  return {
    ok: true,
    status: 200,
    json: async () => ({ resultado: 'ok' }),
    ...parcial,
  }
}

describe('TransporteHttp', () => {
  it('consultar somente dominios da allowlist, com timeout', async () => {
    const buscar = vi.fn(
      async (_url: string, _iniciacao: RequestInit): Promise<RespostaRede> => resposta(),
    )
    const transporte = new TransporteHttp(buscar, 1500)

    await expect(transporte.obterJson('https://viacep.com.br/ws/01001000/json/')).resolves.toEqual({
      resultado: 'ok',
    })

    const iniciacao = buscar.mock.calls[0]?.[1]
    expect(iniciacao?.method).toBe('GET')
    expect(iniciacao?.headers).toEqual({ accept: 'application/json' })
    expect(iniciacao?.signal).toBeInstanceOf(AbortSignal)
  })

  it('bloqueia file:// antes de qualquer requisicao', async () => {
    const buscar = vi.fn(async (): Promise<RespostaRede> => resposta())
    const transporte = new TransporteHttp(buscar)

    await expect(
      transporte.obterJson('file:///C:/Windows/System32/calc.exe'),
    ).rejects.toBeInstanceOf(ErroSemPermissao)
    expect(buscar).not.toHaveBeenCalled()
  })

  it('devolve corpo como unknown e nao expoe detalhe do provedor', async () => {
    const buscar = vi.fn(async (): Promise<RespostaRede> =>
      resposta({ ok: false, status: 503, json: async () => ({ segredo: 'token' }) }),
    )
    const transporte = new TransporteHttp(buscar)

    await expect(transporte.obterJson('https://brasilapi.com.br/api/cep/v1/01001000')).rejects.toThrow(
      'Falha HTTP ao consultar servico externo (503).',
    )
  })
})
