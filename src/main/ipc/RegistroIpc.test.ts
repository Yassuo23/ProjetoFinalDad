import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { CANAIS, type Canal } from '../../shared/contratos/canais'
import type { ErroApi } from '../../shared/contratos/modelos'
import { ErroRegraNegocio } from '../nucleo/erros'
import { RegistroIpc, type RegistradorIpc, type ValidadorOrigem } from './RegistroIpc'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: Canal, payload?: unknown, evento: unknown = {}): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal nao registrado: ${canal}`)
    return ouvinte(evento, payload)
  }
}

class OrigemFalsa implements ValidadorOrigem {
  constructor(private readonly permitido = true) {}

  confiavel(): boolean {
    return this.permitido
  }
}

function erroApi(lancado: unknown): ErroApi {
  expect(lancado).toMatchObject({ codigo: expect.any(String), mensagem: expect.any(String) })
  return lancado as ErroApi
}

describe('RegistroIpc', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('valida o payload e entrega o valor tipado ao servico', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, new OrigemFalsa())
    const tratar = vi.fn(async (entrada: { url: string }): Promise<number> => entrada.url.length)

    registro.registrar(CANAIS.abrirExterno, z.object({ url: z.url() }), tratar)

    await expect(ipc.invocar(CANAIS.abrirExterno, { url: 'https://example.com' })).resolves.toBe(19)
    expect(tratar).toHaveBeenCalledWith({ url: 'https://example.com' })
  })

  it('rejeita payload invalido sem vazar detalhe do Zod', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, new OrigemFalsa())
    const tratar = vi.fn(async (): Promise<void> => undefined)

    registro.registrar(CANAIS.abrirExterno, z.object({ url: z.url() }), tratar)

    const lancado = await ipc.invocar(CANAIS.abrirExterno, { url: 'nao-e-url' }).catch((e: unknown) => e)
    const erro = erroApi(lancado)
    expect(erro.codigo).toBe('VALIDACAO')
    expect(erro.canal).toBe(CANAIS.abrirExterno)
    expect(erro.mensagem).not.toContain('nao-e-url')
    expect(tratar).not.toHaveBeenCalled()
  })

  it('bloqueia chamada de origem nao confiavel', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, new OrigemFalsa(false))
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.appInfo, z.undefined(), tratar)

    const lancado = await ipc.invocar(CANAIS.appInfo, undefined, { iframe: true }).catch((e: unknown) => e)
    expect(erroApi(lancado).codigo).toBe('SEM_PERMISSAO')
    expect(tratar).not.toHaveBeenCalled()
  })

  it('devolve erro de dominio como ErroApi sem stack', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, new OrigemFalsa())

    registro.registrar(CANAIS.appInfo, z.undefined(), async () => {
      throw new ErroRegraNegocio('Operacao indisponivel.', 'detalhe interno')
    })

    const lancado = await ipc.invocar(CANAIS.appInfo, undefined).catch((e: unknown) => e)
    const erro = erroApi(lancado)
    expect(erro.codigo).toBe('REGRA_NEGOCIO')
    expect(erro.mensagem).toBe('Operacao indisponivel.')
    expect(JSON.stringify(erro)).not.toContain('detalhe interno')
  })

  it('converte erro desconhecido em INTERNO generico', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, new OrigemFalsa())

    registro.registrar(CANAIS.appInfo, z.undefined(), async () => {
      throw new Error('SQLITE_SECRET: token=abc')
    })

    const lancado = await ipc.invocar(CANAIS.appInfo, undefined).catch((e: unknown) => e)
    const erro = erroApi(lancado)
    expect(erro.codigo).toBe('INTERNO')
    expect(erro.mensagem).not.toContain('token')
  })

  it('impede dois handlers para o mesmo canal', () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, new OrigemFalsa())

    registro.registrar(CANAIS.appInfo, z.undefined(), async () => 'ok')

    expect(() => registro.registrar(CANAIS.appInfo, z.undefined(), async () => 'ok')).toThrow(
      `Canal duplicado: ${CANAIS.appInfo}`,
    )
    expect(registro.total).toBe(1)
  })
})
