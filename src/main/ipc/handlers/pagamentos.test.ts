import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  Pagamento,
  PagamentoRegistrarEntrada,
  PagamentosListarFiltros,
} from '../../../shared/contratos/modelos'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import type { ServicoPagamentos } from '../../servicos/PagamentoServico'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarPagamentos } from './pagamentos'

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

const PAGAMENTO: Pagamento = {
  id: 12,
  reservaId: 7,
  valor: 370,
  forma: 'pix',
  status: 'pendente',
  pagoEm: null,
  criadoEm: '2026-11-23 10:00:00',
}

const DADOS: PagamentoRegistrarEntrada = { reservaId: 7, valor: 370, forma: 'pix' }

function servicoFalso() {
  const listar = vi.fn((_filtros?: PagamentosListarFiltros): Pagamento[] => [PAGAMENTO])
  const buscarPorReserva = vi.fn((_reservaId: number): Pagamento => PAGAMENTO)
  const registrar = vi.fn((_dados: PagamentoRegistrarEntrada): Pagamento => PAGAMENTO)
  const confirmar = vi.fn((_id: number): Pagamento => ({ ...PAGAMENTO, status: 'pago' }))
  const estornar = vi.fn((_id: number): Pagamento => ({ ...PAGAMENTO, status: 'estornado' }))
  const servico: ServicoPagamentos = { listar, buscarPorReserva, registrar, confirmar, estornar }
  return { servico, listar, buscarPorReserva, registrar, confirmar, estornar }
}

function registrarTudo(ipc: RegistradorFalso, servico: ServicoPagamentos): void {
  registrarPagamentos(new RegistroIpc(ipc), servico)
}

describe('handlers de pagamentos', () => {
  it('registra os cinco canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarTudo(ipc, servico.servico)

    const filtros = { status: 'pendente' as const, reservaId: 7 }
    expect(await ipc.invocar(CANAIS.pagamentosListar, filtros)).toEqual([PAGAMENTO])
    expect(await ipc.invocar(CANAIS.pagamentosBuscarPorReserva, { reservaId: 7 })).toEqual(
      PAGAMENTO,
    )
    expect(await ipc.invocar(CANAIS.pagamentosRegistrar, DADOS)).toEqual(PAGAMENTO)
    expect(await ipc.invocar(CANAIS.pagamentosConfirmar, { id: 12 })).toEqual({
      ...PAGAMENTO,
      status: 'pago',
    })
    expect(await ipc.invocar(CANAIS.pagamentosEstornar, { id: 12 })).toEqual({
      ...PAGAMENTO,
      status: 'estornado',
    })

    expect(servico.listar).toHaveBeenCalledWith(filtros)
    expect(servico.buscarPorReserva).toHaveBeenCalledWith(7)
    expect(servico.registrar).toHaveBeenCalledWith(DADOS)
    expect(servico.confirmar).toHaveBeenCalledWith(12)
    expect(servico.estornar).toHaveBeenCalledWith(12)
  })

  it('aceita listar sem filtros', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarTudo(ipc, servico.servico)

    await ipc.invocar(CANAIS.pagamentosListar)

    expect(servico.listar).toHaveBeenCalledWith({})
  })

  it('rejeita payload inválido com IPC_INVALIDO do canal', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    registrarTudo(ipc, servico.servico)

    const casos: readonly [Canal, unknown][] = [
      [CANAIS.pagamentosListar, { reservaId: -1 }],
      [CANAIS.pagamentosBuscarPorReserva, {}],
      [CANAIS.pagamentosRegistrar, { ...DADOS, valor: 0 }],
      [CANAIS.pagamentosRegistrar, { ...DADOS, forma: 'boleto' }],
      [CANAIS.pagamentosConfirmar, { id: 'doze' }],
      [CANAIS.pagamentosEstornar, {}],
    ]

    for (const [canal, payload] of casos) {
      await expect(ipc.invocar(canal, payload)).rejects.toThrow(`IPC_INVALIDO:${canal}`)
    }
    expect(servico.registrar).not.toHaveBeenCalled()
    expect(servico.confirmar).not.toHaveBeenCalled()
    expect(servico.estornar).not.toHaveBeenCalled()
  })

  it('propaga PAGAMENTO_JA_REGISTRADO sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    servico.registrar.mockImplementation(() => {
      throw new ErroDeDominio('PAGAMENTO_JA_REGISTRADO', 'Pagamento já registrado.')
    })
    registrarTudo(ipc, servico.servico)

    await expect(ipc.invocar(CANAIS.pagamentosRegistrar, DADOS)).rejects.toThrow(
      'PAGAMENTO_JA_REGISTRADO',
    )
  })

  it('propaga VALOR_PAGAMENTO_INVALIDO sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    servico.registrar.mockImplementation(() => {
      throw new ErroDeDominio('VALOR_PAGAMENTO_INVALIDO', 'Valor inválido.')
    })
    registrarTudo(ipc, servico.servico)

    await expect(ipc.invocar(CANAIS.pagamentosRegistrar, DADOS)).rejects.toThrow(
      'VALOR_PAGAMENTO_INVALIDO',
    )
  })

  it('propaga PAGAMENTO_JA_ESTORNADO sem disfarçar o erro', async () => {
    const ipc = new RegistradorFalso()
    const servico = servicoFalso()
    servico.estornar.mockImplementation(() => {
      throw new ErroDeDominio('PAGAMENTO_JA_ESTORNADO', 'Pagamento já estornado.')
    })
    registrarTudo(ipc, servico.servico)

    await expect(ipc.invocar(CANAIS.pagamentosEstornar, { id: 12 })).rejects.toThrow(
      'PAGAMENTO_JA_ESTORNADO',
    )
  })
})
