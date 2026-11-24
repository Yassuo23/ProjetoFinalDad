import type { CalculoMulta } from '../../shared/contratos/modelos'

/** Parâmetros da fórmula de multa — definidos na ADR 0010, alteráveis sem novo contrato. */
export const CARENCIA_DIAS = 90
export const TAXA_DIARIA = 0.005
export const TETO_PERCENTUAL = 0.2

const MS_POR_DIA = 86_400_000

export interface ParametrosCalculoMulta {
  fim: string
  devolvidoEm: string
  valorAquisicao: number
  precoDiaria: number
  diasReserva: number
}

/** Porta usada pelo serviço de devoluções; implementação trocável nos testes. */
export interface ServicoMulta {
  calcular(params: ParametrosCalculoMulta): CalculoMulta
}

/** Fórmula pura: sem banco, IPC ou relógio. A diária vem do cadastro do equipamento. */
export class MultaServico implements ServicoMulta {
  constructor(
    private readonly carenciaDias: number = CARENCIA_DIAS,
    private readonly taxaDiaria: number = TAXA_DIARIA,
    private readonly tetoPercentual: number = TETO_PERCENTUAL,
  ) {}

  calcular(params: ParametrosCalculoMulta): CalculoMulta {
    const diferencaMs = Date.parse(params.devolvidoEm) - Date.parse(params.fim)
    const diasDecorridos = Number.isFinite(diferencaMs)
      ? Math.max(0, Math.ceil(diferencaMs / MS_POR_DIA))
      : 0
    const diasAtraso = Math.max(0, diasDecorridos - this.carenciaDias)

    const valorLocacao = params.precoDiaria * params.diasReserva
    const multaBruta = diasAtraso * this.taxaDiaria * params.valorAquisicao
    const teto = this.tetoPercentual * valorLocacao
    const valorMulta = Math.min(multaBruta, teto)

    return {
      diasAtraso,
      diasCarencia: this.carenciaDias,
      valorDiaria: emCentavos(params.precoDiaria),
      valorLocacao: emCentavos(valorLocacao),
      baseCalculo: emCentavos(params.valorAquisicao),
      percentualDiario: this.taxaDiaria,
      valorMultaBruta: emCentavos(multaBruta),
      valorMulta: emCentavos(valorMulta),
      valorTotal: emCentavos(valorLocacao + valorMulta),
      tetoAplicado: multaBruta > teto,
    }
  }
}

function emCentavos(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100
}
