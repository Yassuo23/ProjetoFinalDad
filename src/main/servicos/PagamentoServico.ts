import type {
  FormaPagamento,
  Pagamento,
  PagamentoAtualizarEntrada,
  PagamentoCriarEntrada,
  PagamentoListarFiltros,
} from '../../shared/contratos/modelos'
import type {
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

export class PagamentoServico implements ServicoPagamentos {
  constructor(
    private readonly repositorio: RepositorioPagamentos,
    private readonly repositorioReservas: RepositorioReservas,
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
    await this.validarReserva(dados.reservaId)

    const valorMulta = dados.valorMulta ?? 0
    const valorTotal = dados.valorBase + valorMulta
    const statusPagamento = dados.statusPagamento
    const dataPagamento =
      statusPagamento === 'Pago' && vazio(dados.dataPagamento)
        ? new Date().toISOString()
        : dados.dataPagamento

    // Somente campos conhecidos: um `valorTotal` externo nunca é repassado.
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

    if (dados.reservaId !== undefined && dados.reservaId !== atual.reservaId) {
      await this.validarReserva(dados.reservaId)
    }

    const valorBase = dados.valorBase ?? atual.valorBase
    const valorMulta = dados.valorMulta ?? atual.valorMulta
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
      ...(dados.statusPagamento !== undefined ? { statusPagamento: dados.statusPagamento } : {}),
      ...(dados.dataPagamento !== undefined || (statusPagamento === 'Pago' && vazio(dataPagamentoEfetiva))
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

  private async validarReserva(id: number): Promise<void> {
    let reserva: unknown
    try {
      reserva = await this.repositorioReservas.buscarPorId(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
    if (!reserva) throw new ErroDeDominio('RELACAO_INVALIDA', 'Reserva não encontrada.')
  }
}
