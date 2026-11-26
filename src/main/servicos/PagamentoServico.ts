import type {
  FormaPagamento,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
  Reserva,
} from '../../shared/contratos/modelos'
import type {
  RepositorioItensReserva,
  RepositorioPagamentos,
  RepositorioReservas,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoPagamentos } from './portas'

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Pagamento não encontrado.')

function formaPagamentoValida(
  valor: FormaPagamento | null | undefined,
): FormaPagamento | null | undefined {
  if (valor === undefined || valor === null) return valor
  return valor.trim() === '' ? null : valor
}

function vazio(valor: string | null | undefined): boolean {
  return valor === undefined || valor === null || valor.trim() === ''
}

function validarValor(valor: number, nome: string): void {
  if (!Number.isFinite(valor) || valor < 0) {
    throw new ErroDeDominio('DADOS_INVALIDOS', `${nome} deve ser um número não negativo.`)
  }
}

function diasReserva(reserva: Reserva): number {
  const inicio = Date.parse(`${reserva.dataInicio.slice(0, 10)}T00:00:00Z`)
  const fim = Date.parse(`${reserva.dataFim.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return 0
  return Math.max(1, Math.round((fim - inicio) / 86_400_000) + 1)
}

export class PagamentoServico implements ServicoPagamentos {
  constructor(
    private readonly repositorio: RepositorioPagamentos,
    private readonly repositorioReservas: RepositorioReservas,
    /** Opcional por compatibilidade; o main sempre injeta para aplicar o teto. */
    private readonly repositorioItens?: RepositorioItensReserva,
  ) {}

  listar(filtros?: PagamentoListarFiltros): Promise<readonly Pagamento[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<Pagamento> {
    const pagamento = await this.repositorio.buscarPorId(id)
    if (!pagamento) throw NAO_ENCONTRADO()
    return pagamento
  }

  async criar(dados: PagamentoCriarEntrada): Promise<Pagamento> {
    const reserva = await this.validarReserva(dados.reservaId)
    const valorMulta = dados.valorMulta ?? 0
    validarValor(dados.valorBase, 'Valor da reserva')
    validarValor(valorMulta, 'Valor da multa')
    await this.validarTeto(reserva, dados.valorBase)

    // O total é sempre derivado: `valorTotal` externo nunca é repassado nem aceito.
    const valorTotal = dados.valorBase + valorMulta
    const statusPagamento = dados.statusPagamento
    const dataPagamento =
      statusPagamento === 'Pago' && vazio(dados.dataPagamento)
        ? new Date().toISOString()
        : dados.dataPagamento

    const envio: PagamentoCriarEntrada = {
      reservaId: dados.reservaId,
      valorBase: dados.valorBase,
      ...(dados.valorMulta !== undefined ? { valorMulta: dados.valorMulta } : {}),
      ...(dados.formaPagamento !== undefined
        ? { formaPagamento: formaPagamentoValida(dados.formaPagamento) }
        : {}),
      ...(statusPagamento !== undefined ? { statusPagamento } : {}),
      ...(dataPagamento !== undefined ? { dataPagamento } : {}),
    }

    try {
      const criado = await this.repositorio.criar(envio)
      return { ...criado, valorTotal }
    } catch (erro) {
      throw paraErroDominio(erro, 'pagamento')
    }
  }

  async atualizar(dados: PagamentoAtualizarEntrada): Promise<Pagamento> {
    const atual = await this.buscarPorId(dados.id)
    const reserva = await this.validarReserva(dados.reservaId ?? atual.reservaId)

    const valorBase = dados.valorBase ?? atual.valorBase
    const valorMulta = dados.valorMulta ?? atual.valorMulta
    validarValor(valorBase, 'Valor da reserva')
    validarValor(valorMulta, 'Valor da multa')
    await this.validarTeto(reserva, valorBase)

    const valorTotal = valorBase + valorMulta
    const statusPagamento = dados.statusPagamento ?? atual.statusPagamento
    const dataPagamentoEfetiva =
      dados.dataPagamento !== undefined ? dados.dataPagamento : atual.dataPagamento
    const dataPagamento =
      statusPagamento === 'Pago' && vazio(dataPagamentoEfetiva)
        ? new Date().toISOString()
        : dataPagamentoEfetiva

    const envio: PagamentoAtualizarEntrada = {
      id: dados.id,
      ...(dados.reservaId !== undefined ? { reservaId: dados.reservaId } : {}),
      ...(dados.valorBase !== undefined ? { valorBase: dados.valorBase } : {}),
      ...(dados.valorMulta !== undefined ? { valorMulta: dados.valorMulta } : {}),
      ...(dados.formaPagamento !== undefined
        ? { formaPagamento: formaPagamentoValida(dados.formaPagamento) }
        : {}),
      ...(dados.statusPagamento !== undefined ? { statusPagamento } : {}),
      ...(dados.dataPagamento !== undefined ||
      (statusPagamento === 'Pago' && vazio(dataPagamentoEfetiva))
        ? { dataPagamento }
        : {}),
    }

    try {
      const atualizado = await this.repositorio.atualizar(envio)
      if (!atualizado) throw NAO_ENCONTRADO()
      return { ...atualizado, valorTotal }
    } catch (erro) {
      throw paraErroDominio(erro, 'pagamento')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)

    let inativado: boolean
    try {
      inativado = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'pagamento')
    }
    if (!inativado) throw NAO_ENCONTRADO()
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

  /** O valor da reserva não pode ultrapassar a soma das diárias pelo período. */
  private async validarTeto(reserva: Reserva, valorBase: number): Promise<void> {
    if (this.repositorioItens === undefined) return
    let diarias: number
    try {
      diarias = await this.repositorioItens.somarDiarias(reserva.id)
    } catch (erro) {
      throw paraErroDominio(erro, 'itens da reserva')
    }
    const previsto = diarias * diasReserva(reserva)
    if (valorBase > previsto + 0.009) {
      throw new ErroDeDominio(
        'DADOS_INVALIDOS',
        'O valor da reserva excede o total previsto para o período.',
      )
    }
  }
}
