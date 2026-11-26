import type {
  Cliente,
  Reserva,
  ReservaAtualizarEntrada,
  ReservaCriarEntrada,
  ReservaListarFiltros,
  StatusReserva,
} from '../../shared/contratos/modelos'
import type {
  RepositorioClientes,
  RepositorioReservas,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type {
  ServicoClima,
  ServicoDisponibilidade,
  ServicoFeriados,
  ServicoReservas,
} from './portas'

type Colaborador =
  | RepositorioClientes
  | ServicoDisponibilidade
  | ServicoClima
  | ServicoFeriados

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Reserva não encontrada.')

function ehDisponibilidade(colaborador: Colaborador): colaborador is ServicoDisponibilidade {
  return typeof colaborador === 'object' && colaborador !== null && 'validarItens' in colaborador
}

function ehClima(colaborador: Colaborador): colaborador is ServicoClima {
  return typeof colaborador === 'object' && colaborador !== null && 'resumo' in colaborador
}

function ehFeriados(colaborador: Colaborador): colaborador is ServicoFeriados {
  return typeof colaborador === 'object' && colaborador !== null && 'feriados' in colaborador
}

function obrigatorio<T>(valor: T | undefined, nome: string): T {
  if (valor === undefined) throw new Error(`Dependência obrigatória não informada: ${nome}`)
  return valor
}

export class ReservaServico implements ServicoReservas {
  private readonly repositorioClientes: RepositorioClientes
  private readonly servicoDisponibilidade: ServicoDisponibilidade
  private readonly servicoClima: ServicoClima
  private readonly servicoFeriados: ServicoFeriados | undefined

  constructor(
    private readonly repositorio: RepositorioReservas,
    ...colaboradores: Colaborador[]
  ) {
    this.repositorioClientes = obrigatorio(
      colaboradores.find(
        (colaborador): colaborador is RepositorioClientes =>
          !ehDisponibilidade(colaborador) && !ehClima(colaborador) && !ehFeriados(colaborador),
      ),
      'repositório de clientes',
    )
    this.servicoDisponibilidade = obrigatorio(
      colaboradores.find(ehDisponibilidade),
      'serviço de disponibilidade',
    )
    this.servicoClima = obrigatorio(colaboradores.find(ehClima), 'serviço de clima')
    this.servicoFeriados = colaboradores.find(ehFeriados)
  }

  listar(
    filtros?: ReservaListarFiltros,
    idClienteProprietario?: number,
  ): Promise<readonly Reserva[]> {
    if (filtros === undefined) {
      return idClienteProprietario === undefined
        ? this.repositorio.listar()
        : this.repositorio.listar({}, idClienteProprietario)
    }
    return this.repositorio.listar(filtros, idClienteProprietario)
  }

  async buscarPorId(id: number, idClienteProprietario?: number): Promise<Reserva> {
    const reserva =
      idClienteProprietario === undefined
        ? await this.repositorio.buscarPorId(id)
        : await this.repositorio.buscarPorId(id, idClienteProprietario)
    if (!reserva) throw NAO_ENCONTRADO()
    return reserva
  }

  async criar(dados: ReservaCriarEntrada, idClienteProprietario?: number): Promise<Reserva> {
    const clienteId = idClienteProprietario ?? dados.clienteId
    await this.validarCliente(clienteId, idClienteProprietario)
    this.validarPeriodo(dados.dataInicio, dados.dataFim)
    this.validarItens(dados.itens)

    await this.validarDisponibilidade(dados.itens, {
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
    })

    const envio: ReservaCriarEntrada = {
      clienteId,
      dataInicio: dados.dataInicio,
      dataFim: dados.dataFim,
      itens: dados.itens,
      ...(dados.previsaoTempo !== undefined ? { previsaoTempo: dados.previsaoTempo } : {}),
    }

    try {
      return await this.repositorio.criar(envio, idClienteProprietario)
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
  }

  async atualizar(
    dados: ReservaAtualizarEntrada,
    idClienteProprietario?: number,
  ): Promise<Reserva> {
    const atual = await this.buscarPorId(dados.id, idClienteProprietario)
    this.validarTransicaoStatus(atual.statusReserva, dados.statusReserva)

    if (dados.clienteId !== undefined && dados.clienteId !== atual.clienteId) {
      await this.validarCliente(dados.clienteId, idClienteProprietario)
    }

    const dataInicio = dados.dataInicio ?? atual.dataInicio
    const dataFim = dados.dataFim ?? atual.dataFim
    this.validarPeriodo(dataInicio, dataFim)

    let previsaoTempo = dados.previsaoTempo
    let altaDemandaPrevista: boolean | null | undefined
    if (dados.statusReserva === 'Confirmada' && atual.statusReserva !== 'Confirmada') {
      // Clima é informativo: falha na consulta não impede a confirmação.
      const resumo = await this.resumoClima(dataInicio)
      if (resumo.trim() !== '') previsaoTempo = resumo

      const demandaClima = this.servicoClima.altaDemanda
        ? await this.servicoClima.altaDemanda(dataInicio).catch(() => null)
        : undefined
      const feriado = await this.ehFeriado(dataInicio)

      if (demandaClima === true || feriado === true) {
        altaDemandaPrevista = true
        previsaoTempo = `${previsaoTempo ?? ''} Alta demanda prevista para esta data.`.trim()
      } else if (demandaClima === false || feriado === false) {
        altaDemandaPrevista = false
      } else if (demandaClima === null) {
        altaDemandaPrevista = null
      }
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
      const atualizada = await this.repositorio.atualizar(envio, idClienteProprietario)
      if (!atualizada) throw NAO_ENCONTRADO()
      return altaDemandaPrevista === undefined
        ? atualizada
        : { ...atualizada, altaDemandaPrevista }
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

  private async validarCliente(id: number, idClienteProprietario?: number): Promise<void> {
    let cliente: Cliente | null
    try {
      cliente =
        idClienteProprietario === undefined
          ? await this.repositorioClientes.buscarPorId(id)
          : await this.repositorioClientes.buscarPorId(id, idClienteProprietario)
    } catch (erro) {
      throw paraErroDominio(erro, 'cliente')
    }
    // ADR 0009: fora do escopo é `NAO_ENCONTRADO`, nunca `SEM_PERMISSAO` —
    // não se deve confirmar que o outro cliente existe. No balcão, a relação
    // inválida continua com o código antigo.
    if (!cliente) {
      throw idClienteProprietario === undefined
        ? new ErroDeDominio('RELACAO_INVALIDA', 'Cliente não encontrado.')
        : NAO_ENCONTRADO()
    }
  }

  /**
   * Transições permitidas (regra de negócio, ADR 0007):
   * `Pendente → Confirmada | Cancelada`, `Confirmada → Concluída | Cancelada`.
   * `Concluída` e `Cancelada` são finais; manter o status atual é sempre idempotente.
   */
  private validarTransicaoStatus(
    origem: StatusReserva,
    destino: StatusReserva | undefined,
  ): void {
    if (destino === undefined || destino === origem) return
    const permitidas: Readonly<Record<StatusReserva, readonly StatusReserva[]>> = {
      Pendente: ['Confirmada', 'Cancelada'],
      Confirmada: ['Concluída', 'Cancelada'],
      Cancelada: [],
      Concluída: [],
    }
    if (permitidas[origem].includes(destino)) return
    throw new ErroDeDominio(
      'DADOS_INVALIDOS',
      `Não é possível alterar o status de ${origem} para ${destino}.`,
    )
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

  /** `null` = consulta indisponível; nunca bloqueia a confirmação (ADR 0008). */
  private async ehFeriado(data: string): Promise<boolean | null> {
    if (this.servicoFeriados === undefined) return null
    const ano = Number(data.slice(0, 4))
    if (!Number.isInteger(ano)) return null
    try {
      const resposta = await this.servicoFeriados.feriados(ano)
      if (resposta.estado === 'indisponivel') return null
      return resposta.feriados.some((feriado) => feriado.data === data)
    } catch {
      return null
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
