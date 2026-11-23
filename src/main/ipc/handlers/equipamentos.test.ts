import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type { Equipamento } from '../../../shared/contratos/modelos'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import type { ServicoEquipamentos } from '../../servicos/EquipamentoServico'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarEquipamentos } from './equipamentos'

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

const equipamento: Equipamento = {
  id: 1,
  nome: 'Tenda',
  categoriaId: 1,
  precoDiaria: 80,
  valorAquisicao: 900,
  estado: 'disponivel',
  ativo: true,
  descricao: null,
}

function servicoFalso(): ServicoEquipamentos {
  return {
    listar: vi.fn(() => [equipamento]),
    buscarPorId: vi.fn(() => equipamento),
    criar: vi.fn(() => equipamento),
    atualizar: vi.fn(() => equipamento),
    inativar: vi.fn(() => undefined),
    listarDisponiveis: vi.fn(() => [equipamento]),
  }
}

describe('handlers de equipamentos', () => {
  it('registra os seis canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarEquipamentos(new RegistroIpc(ipc), servico)

    expect(await ipc.invocar(CANAIS.equipamentosListar, { categoriaId: 1 })).toEqual([equipamento])
    expect(await ipc.invocar(CANAIS.equipamentosBuscarPorId, { id: 1 })).toEqual(equipamento)
    expect(
      await ipc.invocar(CANAIS.equipamentosCriar, {
        nome: 'Tenda',
        categoriaId: 1,
        precoDiaria: 80,
        valorAquisicao: 900,
      }),
    ).toEqual(equipamento)
    expect(await ipc.invocar(CANAIS.equipamentosAtualizar, { id: 1, nome: 'Tenda 2' })).toEqual(
      equipamento,
    )
    await expect(ipc.invocar(CANAIS.equipamentosInativar, { id: 1 })).resolves.toBeUndefined()
    expect(
      await ipc.invocar(CANAIS.equipamentosListarDisponiveis, {
        inicio: '2026-12-01T00:00:00.000Z',
        fim: '2026-12-05T00:00:00.000Z',
      }),
    ).toEqual([equipamento])

    expect(servico.listar).toHaveBeenCalledWith({ categoriaId: 1 })
    expect(servico.inativar).toHaveBeenCalledWith(1)
  })

  it('rejeita payload inválido sem vazar detalhe do Zod', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarEquipamentos(new RegistroIpc(ipc), servico)

    await expect(ipc.invocar(CANAIS.equipamentosCriar, { nome: '' })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.equipamentosCriar}`,
    )
    await expect(
      ipc.invocar(CANAIS.equipamentosBuscarPorId, { id: -1 }),
    ).rejects.toThrow(`IPC_INVALIDO:${CANAIS.equipamentosBuscarPorId}`)
    expect(servico.criar).not.toHaveBeenCalled()
    expect(servico.buscarPorId).not.toHaveBeenCalled()
  })

  it('propaga erro de domínio com o código na mensagem', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    vi.mocked(servico.buscarPorId).mockImplementation(() => {
      throw new ErroDeDominio('ITEM_INDISPONIVEL', 'Item indisponível.')
    })
    registrarEquipamentos(new RegistroIpc(ipc), servico)

    await expect(ipc.invocar(CANAIS.equipamentosBuscarPorId, { id: 7 })).rejects.toThrow(
      'ITEM_INDISPONIVEL',
    )
  })
})
