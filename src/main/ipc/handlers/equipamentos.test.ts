import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  DisponibilidadeResultado,
  Equipamento,
  EquipamentoDisponiveisEntrada,
  VerificarDisponibilidadeEntrada,
} from '../../../shared/contratos/modelos'
import type { ServicoDisponibilidade } from '../../servicos/DisponibilidadeServico'
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

const PERIODO = {
  equipamentoId: 1,
  inicio: '2026-12-01T00:00:00.000Z',
  fim: '2026-12-05T00:00:00.000Z',
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

function disponibilidadeFalsa() {
  const verificar = vi.fn(
    (_entrada: VerificarDisponibilidadeEntrada): DisponibilidadeResultado => ({
      disponivel: true,
    }),
  )
  const filtrar = vi.fn(
    (_itens: readonly Equipamento[], _periodo: EquipamentoDisponiveisEntrada): Equipamento[] => [
      equipamento,
    ],
  )
  const servico: ServicoDisponibilidade = { verificar, filtrar }
  return { servico, verificar }
}

describe('handlers de equipamentos', () => {
  it('registra os sete canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    const disponibilidade = disponibilidadeFalsa()
    registrarEquipamentos(new RegistroIpc(ipc), servico, disponibilidade.servico)

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
    expect(
      await ipc.invocar(CANAIS.equipamentosVerificarDisponibilidade, PERIODO),
    ).toEqual({ disponivel: true })

    expect(servico.listar).toHaveBeenCalledWith({ categoriaId: 1 })
    expect(servico.inativar).toHaveBeenCalledWith(1)
    expect(disponibilidade.verificar).toHaveBeenCalledWith(PERIODO)
  })

  it('rejeita payload inválido sem vazar detalhe do Zod', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    const disponibilidade = disponibilidadeFalsa()
    registrarEquipamentos(new RegistroIpc(ipc), servico, disponibilidade.servico)

    await expect(ipc.invocar(CANAIS.equipamentosCriar, { nome: '' })).rejects.toThrow(
      `IPC_INVALIDO:${CANAIS.equipamentosCriar}`,
    )
    await expect(
      ipc.invocar(CANAIS.equipamentosBuscarPorId, { id: -1 }),
    ).rejects.toThrow(`IPC_INVALIDO:${CANAIS.equipamentosBuscarPorId}`)
    await expect(
      ipc.invocar(CANAIS.equipamentosVerificarDisponibilidade, { ...PERIODO, equipamentoId: -1 }),
    ).rejects.toThrow(`IPC_INVALIDO:${CANAIS.equipamentosVerificarDisponibilidade}`)
    expect(servico.criar).not.toHaveBeenCalled()
    expect(servico.buscarPorId).not.toHaveBeenCalled()
    expect(disponibilidade.verificar).not.toHaveBeenCalled()
  })

  it('propaga erro de domínio com o código na mensagem', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    const disponibilidade = disponibilidadeFalsa()
    vi.mocked(servico.buscarPorId).mockImplementation(() => {
      throw new ErroDeDominio('ITEM_INDISPONIVEL', 'Item indisponível.')
    })
    registrarEquipamentos(new RegistroIpc(ipc), servico, disponibilidade.servico)

    await expect(ipc.invocar(CANAIS.equipamentosBuscarPorId, { id: 7 })).rejects.toThrow(
      'ITEM_INDISPONIVEL',
    )
  })

  it('devolve o motivo ITEM_INDISPONIVEL como resultado, não como erro de IPC', async () => {
    const ipc = new RegistradorFalso()
    const disponibilidade = disponibilidadeFalsa()
    disponibilidade.verificar.mockReturnValue({
      disponivel: false,
      motivo: 'ITEM_INDISPONIVEL',
    })
    registrarEquipamentos(new RegistroIpc(ipc), servicoFalso(), disponibilidade.servico)

    await expect(ipc.invocar(CANAIS.equipamentosVerificarDisponibilidade, PERIODO)).resolves.toEqual(
      { disponivel: false, motivo: 'ITEM_INDISPONIVEL' },
    )
  })
})
