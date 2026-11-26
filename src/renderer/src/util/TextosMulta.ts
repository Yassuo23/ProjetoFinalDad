import { formatadorPtBr } from './FormatadorPtBr'

/** Texto didático da multa com os valores devolvidos pelo main. */
export function textoMulta(
  diasAtraso: number,
  valorDiarioMulta: number,
  valorMulta: number,
): string {
  if (diasAtraso <= 0 || valorMulta <= 0) {
    return 'Sem atraso cobrável: não há multa.'
  }
  const dias = `${diasAtraso} ${diasAtraso === 1 ? 'dia de atraso' : 'dias de atraso'}`
  return `${dias} × ${formatadorPtBr.moeda(valorDiarioMulta)} = ${formatadorPtBr.moeda(valorMulta)}. Domingos e feriados nacionais não são cobrados.`
}

/** Explicação da prévia quando os feriados não puderam ser consultados. */
export function avisoFeriadosIndisponiveis(servico: string): string {
  return `Não conseguimos consultar os feriados (${servico}). Foram descontados apenas os domingos; a devolução continua disponível.`
}
