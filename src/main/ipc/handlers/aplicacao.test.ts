import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type { AppInfo, ErroApi } from '../../../shared/contratos/modelos'
import { RegistroIpc, type RegistradorIpc, type ValidadorOrigem } from '../RegistroIpc'
import { registrarAplicacao, type ServicoAplicacaoIpc } from './aplicacao'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: Canal, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal nao registrado: ${canal}`)
    return ouvinte({}, payload)
  }
}

const origem: ValidadorOrigem = { confiavel: () => true }

function servicoFalso(): ServicoAplicacaoIpc & { abrirExterno: ReturnType<typeof vi.fn> } {
  const informacoes: AppInfo = {
    name: 'Zenite',
    version: '0.1.0',
    electron: '45.0.0',
    node: '24.0.0',
    platform: 'win32',
    arch: 'x64',
  }
  return {
    informacoes: () => informacoes,
    abrirExterno: vi.fn(async (): Promise<void> => undefined),
  }
}

function erroApi(lancado: unknown): ErroApi {
  return lancado as ErroApi
}

describe('handlers de aplicacao', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('devolve appInfo pelo servico injetado', async () => {
    const ipc = new RegistradorFalso()
    registrarAplicacao(new RegistroIpc(ipc, origem), servicoFalso())

    await expect(ipc.invocar(CANAIS.appInfo)).resolves.toMatchObject({ name: 'Zenite' })
  })

  it('abre URL https permitida pelo servico', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarAplicacao(new RegistroIpc(ipc, origem), servico)

    await ipc.invocar(CANAIS.abrirExterno, 'https://www.electronjs.org/docs')

    expect(servico.abrirExterno).toHaveBeenCalledWith('https://www.electronjs.org/docs')
  })

  it('rejeita calc.exe sem chamar o servico', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarAplicacao(new RegistroIpc(ipc, origem), servico)

    const lancado = await ipc
      .invocar(CANAIS.abrirExterno, 'file:///C:/Windows/System32/calc.exe')
      .catch((erro: unknown) => erro)

    expect(erroApi(lancado).codigo).toBe('SEM_PERMISSAO')
    expect(servico.abrirExterno).not.toHaveBeenCalled()
  })

  it('rejeita payload que nao e URL antes de delegar', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarAplicacao(new RegistroIpc(ipc, origem), servico)

    const lancado = await ipc.invocar(CANAIS.abrirExterno, 'nao-e-url').catch((erro: unknown) => erro)

    expect(erroApi(lancado).codigo).toBe('VALIDACAO')
    expect(servico.abrirExterno).not.toHaveBeenCalled()
  })
})
