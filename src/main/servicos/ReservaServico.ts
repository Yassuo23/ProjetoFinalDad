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
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoClima, ServicoDisponibilidade, ServicoReservas } from './portas'

type Colaborador = RepositorioClientes | ServicoDisponibilidade | ServicoClima

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Reserva não encontrada.')

function ehDisponibilidade(colaborador: Colaborador): colaborador is ServicoDisponibilidade {
  return typeof colaborador === 'object' && colaborador !== null && 'validarItens' in colaborador
}

function ehClima(colaborador: Colaborador): colaborador is ServicoClima {
  return typeof colaborador === 'object' && colaborador !== null && 'resumo' in colaborador
}

function obrigatorio<T>(valor: T | undefined, nome: string): T {
  if (valor === undefined) throw new Error(`Dependência obrigatória não informada: ${nome}`)
  return valor
}

export class ReservaServico implements ServicoReservas {
  private readonly repositorioClientes: RepositorioClientes
  private readonly servicoDisponibilidade: ServicoDisponibilidade
  private readonly servicoClima: ServicoClima

  constructor(
    private readonly repositorio: RepositorioReservas,
    ...colaboradores: Colaborador[]
  ) {
    this.repositorioClientes = obrigatorio(
      colaboradores.find(
        (colaborador): colaborador is RepositorioClientes =>
          !ehDisponibilidade(colaborador) && !ehClima(colaborador),
      ),
      'repositório de clientes',
    )
    this.servicoDisponibilidade = obrigatorio(
      colaboradores.find(ehDisponibilidade),
      'serviço de disponibilidade',
    )
    this.servicoClima = obrigatorio(colaboradores.find(ehClima), 'serviço de clima')
  }

  listar(filtros?: ReservaListarFiltros): Promise<readonly Reserva[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<Reserva> {
    const reserva = await this.repositorio.buscarPorId(id)
    if (!reserva) throw NAO_ENCONTRADO()
    return reserva
  }

  async criar(dados: ReservaCriarEntrada): Promise<Reserva> {
    await this.validarCliente(dados.clienteId)
    this.validarPeriodo(dados.dataInicio, dados.dataFim)
    this.validarItens(dados.itens)

    await this.validarDisponibilidade(dados.itens, {
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
    })

    const envio: ReservaCriarEntrada = {
      clienteId: dados.clienteId,
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      itens: dados.itens,
      ...(dados.previsaoTempo !== undefined ? { previsaoTempo: dados.previsaoTempo } : {}),
    }

    try {
      return await this.repositorio.criar(envio)
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
  }

  async atualizar(dados: ReservaAtualizarEntrada): Promise<Reserva> {
    const atual = await this.buscarPorId(dados.id)

    if (dados.clienteId !== undefined && dados.clienteId !== atual.clienteId) {
      await this.validarCliente(dados.clienteId)
    }

    const dataInicio = dados.dataInicio ?? atual.dataInicio
    const dataFim = dados.dataFim ?? atual.dataFim
    this.validarPeriodo(dataInicio, dataFim)

    let previsaoTempo = dados.previsaoTempo
    if (dados.statusReserva === 'Confirmada' && atual.statusReserva !== 'Confirmada') {
      // Clima é informativo: falha na consulta não impede a confirmação.
      const resumo = await this.resumoClima(dataInicio)
      if (resumo.trim() !== '') previsaoTempo = resumo
    }

    if (dados.itens !== undefined) {
      this.validarItens(dados.itens)
      await this.validarDisponibilidade(dados.itens, {
        dataInicio,
        dataFim,
        reservaId: dados.id,
      })
    }

    const envio: ReservaAtualizarEntrada = {
      id: dados.id,
      ...(dados.clienteId !== undefined ? { clienteId: dados.clienteId } : {}),
      ...(dados.dataInicio !== undefined ? { dataInicio: dados.dataInicio } : {}),
      ...(dados.dataFim !== undefined ? { dataFim: dados.dataFim } : {}),
      ...(dados.statusReserva !== undefined ? { statusReserva: dados.statusReserva } : {}),
      ...(previsaoTempo !== undefined ? { previsaoTempo } : {}),
      ...(dados.itens !== undefined ? { itens: dados.itens } : {}),
    }

    try {
      const atualizada = await this.repositorio.atualizar(envio)
      if (!atualizada) throw NAO_ENCONTRADO()
      return atualizada
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)

    let inativado: boolean
    try {
      inativado = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
    if (!inativado) throw NAO_ENCONTRADO()
  }

  private async validarCliente(id: number): Promise<void> {
    let cliente: Cliente | null
    try {
      cliente = await this.repositorioClientes.buscarPorId(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'cliente')
    }
    if (!cliente) throw new ErroDeDominio('RELACAO_INVALIDA', 'Cliente não encontrado.')
  }

  private validarPeriodo(dataInicio: string, dataFim: string): void {
    if (dataInicio > dataFim) {
      throw new ErroDeDominio(
        'PERIODO_INVALIDO',
        'A data de início deve ser anterior ou igual à data de fim.',
      )
    }
  }

  private validarItens(itens: readonly { equipamentoId: number }[]): void {
    if (itens.length === 0) {
      throw new ErroDeDominio('DADOS_INVALIDOS', 'A reserva deve conter ao menos um item.')
    }
  }

  private async validarDisponibilidade(
    itens: readonly { equipamentoId: number }[],
    periodo: { readonly dataInicio: string; readonly dataFim: string; readonly reservaId?: number },
  ): Promise<void> {
    try {
      await this.servicoDisponibilidade.validarItens(itens, periodo)
    } catch (erro) {
      throw paraErroDominio(erro, 'disponibilidade')
    }
  }

  private async resumoClima(dataInicio: string): Promise<string> {
    try {
      return await this.servicoClima.resumo(dataInicio)
    } catch {
      return ''
    }
  }
}
