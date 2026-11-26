import { describe, expect, it } from 'vitest'
import type {
  Cliente,
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
} from '../../shared/contratos/modelos'
import type {
  RepositorioClientes,
  RepositorioReservas,
} from '../repositorios/portas'
import { ReservaServico } from './ReservaServico'
import type { ServicoClima, ServicoDisponibilidade } from './portas'

const AUDITORIA = '2026-01-01T00:00:00.000Z'

function cliente(id: number): Cliente {
  return {
    id,
    nome: `Cliente ${id}`,
    cpf: '52998224725',
    telefone: null,
    email: null,
    cep: null,
    logradouro: null,
    numero: null,
    complemento: null,
    bairro: null,
    cidade: null,
    uf: null,
    ativo: true,
    atualizadoEm: AUDITORIA,
  }
}

function reserva(id: number, clienteId: number): Reserva {
  return {
    id,
    clienteId,
    dataReserva: AUDITORIA,
    dataInicio: '2026-02-16',
    dataFim: '2026-02-18',
    statusReserva: 'Pendente',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: AUDITORIA,
  }
}

class RepositorioReservasFalso implements RepositorioReservas {
  readonly reservas: Reserva[]
  readonly criacoes: {
    readonly dados: ReservaCriarEntrada
    readonly dono: number | undefined
  }[] = []

  constructor(iniciais: readonly Reserva[]) {
    this.reservas = [...iniciais]
  }

  async listar(
    _filtros?: ReservaListarFiltros,
    idClienteProprietario?: number,
  ): Promise<readonly Reserva[]> {
    return this.reservas.filter(
      (item) =>
        item.ativo &&
        (idClienteProprietario === undefined || item.clienteId === idClienteProprietario),
    )
  }

  async buscarPorId(id: number, idClienteProprietario?: number): Promise<Reserva | null> {
    const encontrada = this.reservas.find((item) => item.id === id)
    if (!encontrada) return null
    return idClienteProprietario === undefined || encontrada.clienteId === idClienteProprietario
      ? encontrada
      : null
  }

  async criar(dados: ReservaCriarEntrada, idClienteProprietario?: number): Promise<Reserva> {
    this.criacoes.push({ dados, dono: idClienteProprietario })
    const criada = reserva(this.reservas.length + 1, idClienteProprietario ?? dados.clienteId)
    this.reservas.push(criada)
    return criada
  }

  async atualizar(
    dados: ReservaAtualizarEntrada,
    idClienteProprietario?: number,
  ): Promise<Reserva | null> {
    const atual = await this.buscarPorId(dados.id, idClienteProprietario)
    if (!atual) return null
    atual.clienteId = dados.clienteId ?? atual.clienteId
    return atual
  }

  async inativar(id: number): Promise<boolean> {
    const atual = this.reservas.find((item) => item.id === id)
    if (!atual) return false
    atual.ativo = false
    return true
  }
}

class RepositorioClientesFalso implements RepositorioClientes {
  private readonly clientes = [cliente(1), cliente(2)]

  async listar(): Promise<readonly Cliente[]> {
    return this.clientes
  }

  async buscarPorId(id: number, idClienteProprietario?: number): Promise<Cliente | null> {
    const encontrado = this.clientes.find((item) => item.id === id)
    if (!encontrado) return null
    return idClienteProprietario === undefined || encontrado.id === idClienteProprietario
      ? encontrado
      : null
  }

  async criar(): Promise<Cliente> {
    throw new Error('Não usado neste teste')
  }

  async atualizar(): Promise<Cliente | null> {
    return null
  }

  async inativar(): Promise<boolean> {
    return false
  }

  async cpfEmUso(): Promise<boolean> {
    return false
  }
}

const disponibilidade: ServicoDisponibilidade = {
  listarDisponiveis: async () => [],
  validarItens: async () => undefined,
}

const clima: ServicoClima = { resumo: async () => '' }

function composicao(): {
  repositorio: RepositorioReservasFalso
  servico: ReservaServico
} {
  const repositorio = new RepositorioReservasFalso([reserva(1, 1), reserva(2, 2)])
  return {
    repositorio,
    servico: new ReservaServico(repositorio, new RepositorioClientesFalso(), disponibilidade, clima),
  }
}

const NOVA_RESERVA: ReservaCriarEntrada = {
  clienteId: 2,
  dataInicio: '2026-03-01',
  dataFim: '2026-03-03',
  itens: [{ equipamentoId: 5, valorDiaria: 100 }],
}

describe('Autorização por propriedade em reservas (ADR 0009)', () => {
  it('isola leitura e escrita entre clientes', async () => {
    const { servico } = composicao()

    await expect(servico.listar({}, 1)).resolves.toMatchObject([{ id: 1, clienteId: 1 }])
    await expect(servico.buscarPorId(2, 1)).rejects.toMatchObject({ codigo: 'NAO_ENCONTRADO' })
    await expect(servico.atualizar({ id: 2, dataFim: '2026-03-01' }, 1)).rejects.toMatchObject({
      codigo: 'NAO_ENCONTRADO',
    })
  })

  it('sobrescreve clienteId de outra conta ao criar reserva', async () => {
    const { repositorio, servico } = composicao()

    const criada = await servico.criar(NOVA_RESERVA, 1)

    expect(criada.clienteId).toBe(1)
    expect(repositorio.criacoes[0]?.dados.clienteId).toBe(1)
    expect(repositorio.criacoes[0]?.dono).toBe(1)
  })

  it('recusa transferir reserva própria para outro cliente', async () => {
    const { servico } = composicao()

    await expect(servico.atualizar({ id: 1, clienteId: 2 }, 1)).rejects.toMatchObject({
      codigo: 'NAO_ENCONTRADO',
    })
  })
})
