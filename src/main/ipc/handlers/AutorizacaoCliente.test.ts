import { describe, expect, it } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
  Sessao,
} from '../../../shared/contratos/modelos'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarAutenticacao } from './auth'
import { registrarClientes } from './clientes'
import { registrarIntegracoes } from './integracoes'
import { registrarReservas } from './reservas'
import { registrarUsuarios } from './usuarios'
import type {
  ServicoAutenticacao,
  ServicoCnpj,
  ServicoClientes,
  ServicoFeriados,
  ServicoPrevisaoTempo,
  ServicoReservas,
  ServicoUsuarios,
} from '../../servicos/portas'

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

const cliente: Sessao = {
  usuarioId: 9,
  nome: 'Carla',
  login: 'carla',
  perfil: 'Cliente',
  clienteId: 7,
}

const usuarios: ServicoUsuarios = {
  listar: async () => [],
  criar: async () => {
    throw new Error('Não usado neste teste')
  },
  atualizar: async () => {
    throw new Error('Não usado neste teste')
  },
  alterarSenha: async () => undefined,
}

const previsaoTempo: ServicoPrevisaoTempo = {
  consultar: async (data) => ({ estado: 'indisponivel', data, motivo: 'SEM_DADOS' }),
}
const cnpj: ServicoCnpj = {
  consultar: (numero) => Promise.resolve({ estado: 'indisponivel', cnpj: numero, motivo: 'SEM_DADOS' }),
}
const feriados: ServicoFeriados = {
  feriados: (ano) =>
    Promise.resolve({ estado: 'indisponivel', ano, motivo: 'SEM_DADOS', feriados: [] }),
}

interface ChamadaReserva {
  readonly dados: ReservaCriarEntrada | ReservaAtualizarEntrada
  readonly dono: number | undefined
}

function servicoReservasFalso(): { servico: ServicoReservas; chamadas: ChamadaReserva[] } {
  const chamadas: ChamadaReserva[] = []
  const reserva: Reserva = {
    id: 1,
    clienteId: 7,
    dataReserva: '2026-01-01T00:00:00.000Z',
    dataInicio: '2026-03-01',
    dataFim: '2026-03-03',
    statusReserva: 'Pendente',
    previsaoTempo: null,
    ativo: true,
    atualizadoEm: '2026-01-01T00:00:00.000Z',
  }
  const servico: ServicoReservas = {
    listar: async (_filtros?: ReservaListarFiltros, dono?: number) => {
      chamadas.push({
        dados: {
          clienteId: dono ?? 0,
          dataInicio: '',
          dataFim: '',
          itens: [],
        },
        dono,
      })
      return [reserva]
    },
    buscarPorId: async () => reserva,
    criar: async (dados, dono) => {
      chamadas.push({ dados, dono })
      return reserva
    },
    atualizar: async (dados, dono) => {
      chamadas.push({ dados, dono })
      return reserva
    },
    inativar: async () => undefined,
  }
  return { servico, chamadas }
}

function servicoClientesFalso(): { servico: ServicoClientes; donos: (number | undefined)[] } {
  const donos: (number | undefined)[] = []
  const servico: ServicoClientes = {
    listar: async () => [],
    buscarPorId: async (_id, dono) => {
      donos.push(dono)
      throw new Error('Não encontrado')
    },
    buscarCep: async () => {
      throw new Error('Não usado neste teste')
    },
    criar: async () => {
      throw new Error('Não usado neste teste')
    },
    atualizar: async () => {
      throw new Error('Não usado neste teste')
    },
    inativar: async () => undefined,
  }
  return { servico, donos }
}

const autenticacao: ServicoAutenticacao = {
  sessao: () => null,
  entrar: async () => {
    throw new Error('Não usado neste teste')
  },
  sair: async () => undefined,
  sessaoAtual: async () => ({ estado: 'anonima' }),
  bootstrap: async () => {
    throw new Error('Não usado neste teste')
  },
  cadastrarCliente: async () => {
    throw new Error('Não usado neste teste')
  },
}

describe('Grupos de permissão e escopo do cliente no main (ADR 0009)', () => {
  function composicao(ativa: Sessao | null = cliente) {
    const ipc = new RegistradorFalso()
    const registro = new RegistroIpc(ipc, { sessao: () => ativa })
    const reservas = servicoReservasFalso()
    const clientesFalso = servicoClientesFalso()
    registrarUsuarios(registro, usuarios)
    registrarIntegracoes(registro, { previsaoTempo, cnpj, feriados })
    registrarReservas(registro, reservas.servico, { sessao: () => cliente })
    registrarClientes(registro, clientesFalso.servico, { sessao: () => cliente })
    registrarAutenticacao(registro, autenticacao)
    return { ipc, reservas, clientesFalso }
  }

  it('nega cliente em usuarios:listar e integracoes:cnpj', async () => {
    const { ipc } = composicao()

    await expect(ipc.invocar(CANAIS.usuariosListar)).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    })
    await expect(ipc.invocar(CANAIS.integracoesCnpj, { cnpj: '11222333000181' })).rejects.toMatchObject({
      codigo: 'SEM_PERMISSAO',
    })
  })

  it('nega anônimo em canais autenticados e libera previsão e feriados ao cliente', async () => {
    const anonimo = new RegistradorFalso()
    const registroAnonimo = new RegistroIpc(anonimo, { sessao: () => null })
    registrarIntegracoes(registroAnonimo, { previsaoTempo, cnpj, feriados })
    await expect(anonimo.invocar(CANAIS.integracoesFeriados, { ano: 2026 })).rejects.toMatchObject({
      codigo: 'NAO_AUTENTICADO',
    })

    const { ipc } = composicao()
    await expect(ipc.invocar(CANAIS.integracoesPrevisaoTempo, { data: '2026-03-01' })).resolves.toMatchObject({
      estado: 'indisponivel',
    })
    await expect(ipc.invocar(CANAIS.integracoesFeriados, { ano: 2026 })).resolves.toMatchObject({
      estado: 'indisponivel',
    })
  })

  it('deriva o dono da sessão e ignora clienteId forjado ao criar reserva', async () => {
    const { ipc, reservas } = composicao()

    await ipc.invocar(CANAIS.reservasCriar, {
      clienteId: 999,
      dataInicio: '2026-03-01',
      dataFim: '2026-03-03',
      itens: [{ equipamentoId: 1, valorDiaria: 100 }],
    })

    expect(reservas.chamadas[0]).toMatchObject({ dono: 7, dados: { clienteId: 7 } })
  })

  it('filtra cadastro do cliente pelo id da sessão', async () => {
    const { ipc, clientesFalso } = composicao()

    await expect(ipc.invocar(CANAIS.clientesBuscarPorId, { id: 999 })).rejects.toThrow()
    expect(clientesFalso.donos).toEqual([7])
  })

  it('schema strict do cadastro público recusa perfil antes do serviço', async () => {
    const ipcPublico = new RegistradorFalso()
    registrarAutenticacao(
      new RegistroIpc(ipcPublico, { sessao: () => null }),
      autenticacao,
    )

    await expect(
      ipcPublico.invocar(CANAIS.authCadastrarCliente, {
        nome: 'Carla',
        cpf: '529.982.247-25',
        login: 'carla',
        senha: 'SenhaForte2026',
        perfil: 'Administrador',
      }),
    ).rejects.toThrow(`IPC_INVALIDO:${CANAIS.authCadastrarCliente}`)
  })
})
