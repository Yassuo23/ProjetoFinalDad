import type {
  ChaveItemReservaEntrada,
  ItemReserva,
  ItemReservaAtualizarEntrada,
  ItemReservaCriarEntrada,
  ItemReservaListarFiltros,
  Reserva,
} from '../../shared/contratos/modelos'
import type {
  RepositorioEquipamentos,
  RepositorioItensReserva,
  RepositorioReservas,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoDisponibilidade, ServicoItensReserva } from './portas'

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Item de reserva não encontrado.')

export class ItemReservaServico implements ServicoItensReserva {
  constructor(
    private readonly repositorio: RepositorioItensReserva,
    private readonly repositorioReservas: RepositorioReservas,
    private readonly repositorioEquipamentos: RepositorioEquipamentos,
    private readonly servicoDisponibilidade: ServicoDisponibilidade,
  ) {}

  listar(
    filtros?: ItemReservaListarFiltros,
    idClienteProprietario?: number,
  ): Promise<readonly ItemReserva[]> {
    if (filtros === undefined) {
      return idClienteProprietario === undefined
        ? this.repositorio.listar()
        : this.repositorio.listar({}, idClienteProprietario)
    }
    return this.repositorio.listar(filtros, idClienteProprietario)
  }

  async buscarPorId(chave: ChaveItemReservaEntrada): Promise<ItemReserva> {
    const item = await this.repositorio.buscarPorId(chave)
    if (!item) throw NAO_ENCONTRADO()
    return item
  }

  async criar(dados: ItemReservaCriarEntrada): Promise<ItemReserva> {
    const reserva = await this.validarReserva(dados.reservaId)
    await this.validarEquipamento(dados.equipamentoId)

    try {
      await this.servicoDisponibilidade.validarItens(
        [{ equipamentoId: dados.equipamentoId }],
        {
          dataInicio: reserva.dataInicio,
          dataFim: reserva.dataFim,
          reservaId: dados.reservaId,
        },
      )
    } catch (erro) {
      throw paraErroDominio(erro, 'disponibilidade')
    }

    let existente: ItemReserva | null
    try {
      existente = await this.repositorio.buscarPorId({
        reservaId: dados.reservaId,
        equipamentoId: dados.equipamentoId,
      })
    } catch (erro) {
      throw paraErroDominio(erro, 'item de reserva')
    }
    if (existente) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'Item de reserva já cadastrado.')
    }

    const envio: ItemReservaCriarEntrada = {
      reservaId: dados.reservaId,
      equipamentoId: dados.equipamentoId,
      valorDiaria: dados.valorDiaria,
    }

    try {
      return await this.repositorio.criar(envio)
    } catch (erro) {
      throw paraErroDominio(erro, 'item de reserva')
    }
  }

  async atualizar(dados: ItemReservaAtualizarEntrada): Promise<ItemReserva> {
    await this.buscarPorId(dados)

    const envio: ItemReservaAtualizarEntrada = {
      reservaId: dados.reservaId,
      equipamentoId: dados.equipamentoId,
      ...(dados.valorDiaria !== undefined ? { valorDiaria: dados.valorDiaria } : {}),
    }

    try {
      const atualizado = await this.repositorio.atualizar(envio)
      if (!atualizado) throw NAO_ENCONTRADO()
      return atualizado
    } catch (erro) {
      throw paraErroDominio(erro, 'item de reserva')
    }
  }

  async remover(chave: ChaveItemReservaEntrada): Promise<void> {
    let removido: boolean
    try {
      removido = await this.repositorio.remover(chave)
    } catch (erro) {
      throw paraErroDominio(erro, 'item de reserva')
    }
    if (!removido) throw NAO_ENCONTRADO()
  }

  private async validarReserva(id: number): Promise<Reserva> {
    let reserva: Reserva | null
    try {
      reserva = await this.repositorioReservas.buscarPorId(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
    if (!reserva) throw new ErroDeDominio('RELACAO_INVALIDA', 'Reserva não encontrada.')
    return reserva
  }

  private async validarEquipamento(id: number): Promise<void> {
    let equipamento: unknown
    try {
      equipamento = await this.repositorioEquipamentos.buscarPorId(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'equipamento')
    }
    if (!equipamento) {
      throw new ErroDeDominio('RELACAO_INVALIDA', 'Equipamento não encontrado.')
    }
  }
}
