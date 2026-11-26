import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { CANAIS, type Canal } from '../../shared/contratos/canais'
import type { Sessao } from '../../shared/contratos/modelos'
import { ErroDeDominio } from '../servicos/ErroDeDominio'
import { PERFIS, RegistroIpc, type RegistradorIpc } from './RegistroIpc'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: Canal, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal não registrado: ${canal}`)
    return ouvinte(undefined, payload)
  }
}

describe('RegistroIpc', () => {
  it('valida o payload e entrega o valor tipado ao serviço', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc)
    const tratar = vi.fn(async (entrada: { url: string }): Promise<number> => entrada.url.length)

    registro.registrar(CANAIS.abrirExterno, z.object({ url: z.url() }), tratar, PERFIS.publico)

    await expect(ipc.invocar(CANAIS.abrirExterno, { url: 'https://example.com' })).resolves.toBe(19)
    expect(tratar).toHaveBeenCalledWith({ url: 'https://example.com' })
  })

  it('rejeita payload inválido sem vazar o detalhe do Zod', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc)
    const tratar = vi.fn(async (): Promise<void> => undefined)

    registro.registrar(CANAIS.abrirExterno, z.object({ url: z.url() }), tratar, PERFIS.publico)

    await expect(ipc.invocar(CANAIS.abrirExterno, { url: 'nao-e-url' })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.abrirExterno}`,
    )
    expect(tratar).not.toHaveBeenCalled()
  })

  it('impede dois handlers para o mesmo canal', () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc)

    registro.registrar(CANAIS.appInfo, z.undefined(), async () => 'ok', PERFIS.publico)

    expect(() =>
      registro.registrar(CANAIS.appInfo, z.undefined(), async () => 'ok', PERFIS.publico),
    ).toThrow(
      `Canal duplicado: ${CANAIS.appInfo}`,
    )
    expect(registro.total).toBe(1)
  })
})

type PerfilSessaoTeste = Sessao['perfil'] | 'Cliente'

/**
 * ADR 0009: `Sessao` passa a exigir `clienteId`. `Object.assign` mantém este
 * helper válido antes e depois dessa adição ao contrato compartilhado.
 */
function sessao(perfil: PerfilSessaoTeste): Sessao {
  const base = {
    usuarioId: 1,
    nome: 'Ana',
    login: 'ana',
    perfil: perfil as Sessao['perfil'],
  }
  return Object.assign(base, { clienteId: perfil === 'Cliente' ? 7 : null })
}

describe('RegistroIpc — autorização por perfil no main', () => {
  function composicao(perfilAtual: Sessao | null = null) {
    const ipc = new RegistradorFalso()
    const atual = { sessao: perfilAtual }
    const registro = new RegistroIpc(ipc, { sessao: () => atual.sessao })
    return { ipc, registro, atual }
  }

  it('nega canal administrativo a atendente com SEM_PERMISSAO', async () => {
    const { ipc, registro } = composicao(sessao('Atendente'))
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.usuariosListar, z.undefined(), tratar, PERFIS.admin)

    await expect(ipc.invocar(CANAIS.usuariosListar)).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    })
    expect(tratar).not.toHaveBeenCalled()
  })

  it('nega canal autenticado sem sessão com NAO_AUTENTICADO', async () => {
    const { ipc, registro } = composicao()
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.clientesListar, z.undefined(), tratar, PERFIS.ambos)

    await expect(ipc.invocar(CANAIS.clientesListar)).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })
    expect(tratar).not.toHaveBeenCalled()
  })

  it('perfil administrador acessa todos os canais', async () => {
    const { ipc, registro, atual } = composicao(sessao('Administrador'))
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.usuariosListar, z.undefined(), tratar, PERFIS.admin)
    registro.registrar(CANAIS.clientesListar, z.undefined(), tratar, PERFIS.ambos)
    registro.registrar(CANAIS.appInfo, z.undefined(), tratar, PERFIS.publico)

    await expect(ipc.invocar(CANAIS.usuariosListar)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.clientesListar)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.appInfo)).resolves.toBe('ok')

    // A guarda lê a sessão a cada chamada: sair revoga o acesso imediatamente.
    atual.sessao = null
    await expect(ipc.invocar(CANAIS.usuariosListar)).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })
  })

  it('atendente acessa operações de balcão, mas não exclui cadastros', async () => {
    const { ipc, registro } = composicao(sessao('Atendente'))
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.reservasCriar, z.undefined(), tratar, PERFIS.ambos)
    registro.registrar(CANAIS.pagamentosCriar, z.undefined(), tratar, PERFIS.ambos)
    registro.registrar(CANAIS.clientesInativar, z.undefined(), tratar, PERFIS.admin)

    await expect(ipc.invocar(CANAIS.reservasCriar)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.pagamentosCriar)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.clientesInativar)).rejects.toBeInstanceOf(ErroDeDominio)
  })

  it('cliente acessa reserva própria, canais públicos e saída (ADR 0009)', async () => {
    const { ipc, registro } = composicao(sessao('Cliente'))
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.reservasCriar, z.undefined(), tratar, PERFIS.cliente)
    registro.registrar(CANAIS.appInfo, z.undefined(), tratar, PERFIS.publico)
    registro.registrar(CANAIS.authSair, z.undefined(), tratar, PERFIS.autenticados)

    await expect(ipc.invocar(CANAIS.reservasCriar)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.appInfo)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.authSair)).resolves.toBe('ok')
  })

  it('cliente é negado em usuários:listar e integracoes:cnpj com SEM_PERMISSAO', async () => {
    const { ipc, registro } = composicao(sessao('Cliente'))
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.usuariosListar, z.undefined(), tratar, PERFIS.admin)
    registro.registrar(CANAIS.integracoesCnpj, z.undefined(), tratar, PERFIS.admin)

    await expect(ipc.invocar(CANAIS.usuariosListar)).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    })
    await expect(ipc.invocar(CANAIS.integracoesCnpj)).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    })
    expect(tratar).not.toHaveBeenCalled()
  })

  it('auto-cadastro funciona sem sessão; reserva sem sessão é negada', async () => {
    const { ipc, registro } = composicao()
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.authCadastrarCliente, z.undefined(), tratar, PERFIS.anonimo)
    registro.registrar(CANAIS.reservasCriar, z.undefined(), tratar, PERFIS.cliente)

    await expect(ipc.invocar(CANAIS.authCadastrarCliente)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.reservasCriar)).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })
    expect(tratar).toHaveBeenCalledTimes(1)
  })

  it('bootstrap e entrada são anônimos; sair exige sessão', async () => {
    const { ipc, registro, atual } = composicao()
    const tratar = vi.fn(async (): Promise<string> => 'ok')

    registro.registrar(CANAIS.authBootstrap, z.undefined(), tratar, PERFIS.anonimo)
    registro.registrar(CANAIS.authEntrar, z.undefined(), tratar, PERFIS.publico)
    registro.registrar(CANAIS.authSair, z.undefined(), tratar, PERFIS.autenticados)

    await expect(ipc.invocar(CANAIS.authBootstrap)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.authEntrar)).resolves.toBe('ok')
    await expect(ipc.invocar(CANAIS.authSair)).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })

    atual.sessao = sessao('Administrador')
    await expect(ipc.invocar(CANAIS.authSair)).resolves.toBe('ok')
    // Mesmo autenticado, bootstrap não pode ser repetido.
    await expect(ipc.invocar(CANAIS.authBootstrap)).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    })
  })

  it('verifica a autorização antes de validar o payload sensível', async () => {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, { sessao: () => null })
    const tratar = vi.fn(async (): Promise<string> => 'ok')
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    registro.registrar(
      CANAIS.authBootstrap,
      z.object({ senha: z.string().min(8) }),
      tratar,
      PERFIS.admin,
    )

    await expect(ipc.invocar(CANAIS.authBootstrap, { senha: '123' })).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })
    expect(tratar).not.toHaveBeenCalled()
    expect(espiao).not.toHaveBeenCalled()
    espiao.mockRestore()
  })

  it('mantém IPC_INVALIDO para payload malformado quando autorizado', async () => {
    const { ipc, registro } = composicao(sessao('Administrador'))
    const tratar = vi.fn(async (): Promise<string> => 'ok')
    const espiao = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    registro.registrar(
      CANAIS.authBootstrap,
      z.object({ senha: z.string().min(8) }),
      tratar,
      PERFIS.admin,
    )

    await expect(ipc.invocar(CANAIS.authBootstrap, { senha: '123' })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.authBootstrap}`,
    )
    expect(espiao).toHaveBeenCalledWith(
      `[IPC] Payload inválido em ${CANAIS.authBootstrap}`,
      'senha',
    )
    espiao.mockRestore()
  })
})
