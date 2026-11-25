import type {
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  Reserva,
} from '../../shared/contratos/modelos'
import type {
  RepositorioDevolucoes,
  RepositorioReservas,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoDevolucoes } from './portas'

const MS_POR_DIA = 86_400_000
const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Devolução não encontrada.')

/** Compara apenas YYYY-MM-DD: horário e fuso não podem gerar dias de atraso. */
function dia(valor: string | undefined): string {
  if (valor !== undefined && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

function diasDeAtraso(dataEfetiva: string | undefined, dataFim: string): number {
  const inicio = Date.parse(`${dia(dataEfetiva)}T00:00:00Z`)
  const fim = Date.parse(`${dataFim}T00:00:00Z`)
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return 0
  return Math.max(0, Math.trunc((inicio - fim) / MS_POR_DIA))
}

function valorDaDiaria(): number {
  const configurado = Number(process.env.MULTA_DIARIA_VALOR ?? '20')
  return Number.isFinite(configurado) && configurado > 0 ? configurado : 20
}

export class DevolucaoServico implements ServicoDevolucoes {
  constructor(
    private readonly repositorio: RepositorioDevolucoes,
    private readonly repositorioReservas: RepositorioReservas,
  ) {}

  listar(filtros?: DevolucaoListarFiltros): Promise<readonly Devolucao[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<Devolucao> {
    const devolucao = await this.repositorio.buscarPorId(id)
    if (!devolucao) throw NAO_ENCONTRADO()
    return devolucao
  }

  async criar(dados: DevolucaoCriarEntrada): Promise<Devolucao> {
    const reserva = await this.validarReserva(dados.reservaId)

    let anterior: Devolucao | null
    try {
      anterior = await this.repositorio.buscarPorReserva(dados.reservaId)
    } catch (erro) {
      throw paraErroDominio(erro, 'devolução')
    }
    if (anterior) {
      throw new ErroDeDominio('REGISTRO_DUPLICADO', 'Já existe devolução para esta reserva.')
    }

    const envio: DevolucaoCriarEntrada = {
      reservaId: dados.reservaId,
      estadoPosUso: dados.estadoPosUso,
      ...(dados.dataDevolucaoEfetiva !== undefined
        ? { dataDevolucaoEfetiva: dados.dataDevolucaoEfetiva }
        : {}),
      ...(dados.observacoes !== undefined ? { observacoes: dados.observacoes } : {}),
    }

    const efeitos = {
      valorMulta: diasDeAtraso(dados.dataDevolucaoEfetiva, reserva.dataFim) * valorDaDiaria(),
      manutencao: dados.estadoPosUso !== 'Perfeito',
    }

    try {
      return await this.repositorio.criarComEfeitos(envio, efeitos)
    } catch (erro) {
      throw paraErroDominio(erro, 'devolução')
    }
  }

  async atualizar(dados: DevolucaoAtualizarEntrada): Promise<Devolucao> {
    await this.buscarPorId(dados.id)

    // Efeitos (multa/manutenção) são imutáveis: uma troca posterior para
    // "Danificado" não reaplica a manutenção nem recalcula a multa.
    const envio: DevolucaoAtualizarEntrada = {
      id: dados.id,
      ...(dados.dataDevolucaoEfetiva !== undefined
        ? { dataDevolucaoEfetiva: dados.dataDevolucaoEfetiva }
        : {}),
      ...(dados.estadoPosUso !== undefined ? { estadoPosUso: dados.estadoPosUso } : {}),
      ...(dados.observacoes !== undefined ? { observacoes: dados.observacoes } : {}),
    }

    try {
      const atualizada = await this.repositorio.atualizar(envio)
      if (!atualizada) throw NAO_ENCONTRADO()
      return atualizada
    } catch (erro) {
      throw paraErroDominio(erro, 'devolução')
    }
  }

  async inativar(id: number): Promise<void> {
    await this.buscarPorId(id)

    let inativado: boolean
    try {
      inativado = await this.repositorio.inativar(id)
    } catch (erro) {
      throw paraErroDominio(erro, 'devolução')
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
}
