import type {
  CalculoMulta,
  CalculoMultaEntrada,
  Devolucao,
  DevolucaoAtualizarEntrada,
  DevolucaoCriarEntrada,
  DevolucaoListarFiltros,
  DevolucaoPendente,
  DevolucoesPendentesEntrada,
  Reserva,
} from '../../shared/contratos/modelos'
import type {
  DevolucaoPendenteBruta,
  RepositorioDevolucoes,
  RepositorioReservas,
} from '../repositorios/portas'
import { ErroDeDominio, paraErroDominio } from './ErroDeDominio'
import type { ServicoDevolucoes, ServicoFeriados } from './portas'

const NAO_ENCONTRADO = (): ErroDeDominio =>
  new ErroDeDominio('NAO_ENCONTRADO', 'Devolução não encontrada.')

/** Compara apenas YYYY-MM-DD: horário e fuso não podem gerar dias de atraso. */
function dia(valor: string | undefined): string {
  if (valor !== undefined && /^\d{4}-\d{2}-\d{2}/.test(valor)) return valor.slice(0, 10)
  return new Date().toISOString().slice(0, 10)
}

/** Dias corridos entre duas datas ISO; negativo quando a referência é anterior. */
function diasEntre(dataFim: string, referencia: string): number {
  const inicio = Date.parse(`${dataFim.slice(0, 10)}T00:00:00Z`)
  const fim = Date.parse(`${referencia.slice(0, 10)}T00:00:00Z`)
  if (!Number.isFinite(inicio) || !Number.isFinite(fim)) return 0
  return Math.round((fim - inicio) / 86_400_000)
}

function valorDaDiaria(): number {
  const configurado = Number(process.env.MULTA_DIARIA_VALOR ?? '20')
  return Number.isFinite(configurado) && configurado > 0 ? configurado : 20
}

export class DevolucaoServico implements ServicoDevolucoes {
  constructor(
    private readonly repositorio: RepositorioDevolucoes,
    private readonly repositorioReservas: RepositorioReservas,
    /** ADR 0008: opcional para preservar as chamadas atuais com dois argumentos. */
    private readonly servicoFeriados?: ServicoFeriados,
  ) {}

  listar(filtros?: DevolucaoListarFiltros): Promise<readonly Devolucao[]> {
    return filtros === undefined ? this.repositorio.listar() : this.repositorio.listar(filtros)
  }

  async buscarPorId(id: number): Promise<Devolucao> {
    const devolucao = await this.repositorio.buscarPorId(id)
    if (!devolucao) throw NAO_ENCONTRADO()
    return devolucao
  }

  /**
   * ADR 0007: prévia discriminada por reserva. A multa definitiva continua
   * sendo gravada por `criar`, com a mesma regra de dias cobráveis.
   */
  async listarPendentes(entrada?: DevolucoesPendentesEntrada): Promise<readonly DevolucaoPendente[]> {
    const referencia = dia(entrada?.data)
    let pendentes: readonly DevolucaoPendenteBruta[]
    try {
      pendentes = await this.repositorio.listarPendentes(referencia)
    } catch (erro) {
      throw paraErroDominio(erro, 'devoluções pendentes')
    }

    const diario = valorDaDiaria()
    const resultado: DevolucaoPendente[] = []
    for (const pendente of pendentes) {
      const diasCorridos = Math.max(0, diasEntre(pendente.dataPrevista, referencia))
      const diasCobraveis = await this.diasCobraveis(referencia, pendente.dataPrevista)
      resultado.push({
        ...pendente,
        status: diasCorridos > 0 ? 'Atrasada' : 'No prazo',
        atrasada: diasCorridos > 0,
        diasAtraso: diasCorridos,
        valorMultaEstimado: diasCobraveis * diario,
      })
    }
    return resultado
  }

  async calcularMulta(dados: CalculoMultaEntrada): Promise<CalculoMulta> {
    let reserva: Reserva | null
    try {
      reserva = await this.repositorioReservas.buscarPorId(dados.reservaId)
    } catch (erro) {
      throw paraErroDominio(erro, 'reserva')
    }
    if (!reserva) throw new ErroDeDominio('NAO_ENCONTRADO', 'Reserva não encontrada.')

    const dataPrevista = reserva.dataFim.slice(0, 10)
    const dataDevolucao = dados.dataDevolucao.slice(0, 10)
    const diasAtraso = await this.diasCobraveis(dataDevolucao, dataPrevista)
    const valorDiarioMulta = valorDaDiaria()

    return {
      reservaId: dados.reservaId,
      dataPrevista,
      dataDevolucao,
      diasAtraso,
      valorDiarioMulta,
      valorMulta: diasAtraso * valorDiarioMulta,
    }
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

    const dias = await this.diasCobraveis(dados.dataDevolucaoEfetiva, reserva.dataFim)
    const efeitos = {
      valorMulta: dias * valorDaDiaria(),
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

  /**
   * ADR 0008: conta somente dias cobráveis — começa no dia seguinte ao fim da
   * reserva e ignora domingos e feriados nacionais. Sábado continua cobrando.
   */
  private async diasCobraveis(dataEfetiva: string | undefined, dataFim: string): Promise<number> {
    const fim = dataFim.slice(0, 10)
    const efetiva = dia(dataEfetiva)
    const limite = Date.parse(`${efetiva}T00:00:00Z`)
    const inicio = Date.parse(`${fim}T00:00:00Z`)
    if (!Number.isFinite(inicio) || !Number.isFinite(limite) || limite <= inicio) return 0

    const feriados = await this.carregarFeriados(fim, efetiva)
    const atual = new Date(inicio)
    let dias = 0
    while (atual.getTime() < limite) {
      atual.setUTCDate(atual.getUTCDate() + 1)
      const iso = atual.toISOString().slice(0, 10)
      if (atual.getUTCDay() === 0 || feriados.has(iso)) continue
      dias += 1
    }
    return dias
  }

  /** Indisponibilidade não bloqueia a devolução: descontam-se apenas domingos. */
  private async carregarFeriados(fim: string, efetiva: string): Promise<Set<string>> {
    if (this.servicoFeriados === undefined) return new Set()
    const anos = new Set([fim.slice(0, 4), efetiva.slice(0, 4)])
    const feriados = new Set<string>()
    for (const anoTexto of anos) {
      try {
        const resposta = await this.servicoFeriados.feriados(Number(anoTexto))
        if (resposta.estado === 'disponivel') {
          for (const feriado of resposta.feriados) feriados.add(feriado.data)
        }
      } catch {
        // Serviço externo torna indisponível: segue com a regra parcial (domingos).
      }
    }
    return feriados
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
