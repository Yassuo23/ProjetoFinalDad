import type { CelulaCsv } from '../../shared/contratos/modelos'

const DELIMITADOR = ','

/** Aspas sempre dobradas; `= + - @` recebem apóstrofo para evitar formula injection. */
export function escaparCelulaCsv(valor: CelulaCsv): string {
  if (valor === null) return ''
  const texto = typeof valor === 'string' ? valor : String(valor)
  const seguro = /^\s*[=+\-@]/u.test(texto) ? `'${texto}` : texto
  return `"${seguro.replace(/"/g, '""')}"`
}

/** Uma linha por vez, com delimitador fixo — o main decide o formato, não o renderer. */
export function linhaCsv(celulas: readonly CelulaCsv[]): string {
  return celulas.map(escaparCelulaCsv).join(DELIMITADOR)
}
