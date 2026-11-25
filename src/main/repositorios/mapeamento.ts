import type { RegistroBanco } from '../banco/ClienteBanco'

/**
 * Leitura defensiva de linhas do MySQL.
 *
 * O mysql2 devolve DECIMAL como string, TIMESTAMP/DATE como `Date` (ou string
 * ISO quando `dateStrings` está ativo) e TINYINT(1) como número. Estes helpers
 * normalizam tudo para os tipos do domínio e falham com um código estável por
 * entidade — a mensagem nunca carrega conteúdo do banco.
 */

function linhaInvalida(entidade: string): never {
  throw new Error(`${entidade}_LINHA_INVALIDA`)
}

function ehTexto(valor: unknown): valor is string {
  return typeof valor === 'string'
}

function ehData(valor: unknown): valor is Date {
  return valor instanceof Date && !Number.isNaN(valor.getTime())
}

const DECIMAL = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/
const ISO_DATA_HORA =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/
const ISO_DATA = /^(\d{4})-(\d{2})-(\d{2})$/

export function texto(linha: RegistroBanco, coluna: string, entidade: string): string {
  const valor = linha[coluna]
  if (!ehTexto(valor)) linhaInvalida(entidade)
  return valor
}

export function textoOpcional(
  linha: RegistroBanco,
  coluna: string,
  entidade: string,
): string | null {
  const valor = linha[coluna]
  if (valor === null || valor === undefined) return null
  if (!ehTexto(valor)) linhaInvalida(entidade)
  return valor
}

export function numero(linha: RegistroBanco, coluna: string, entidade: string): number {
  const valor = linha[coluna]
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor
  if (ehTexto(valor) && DECIMAL.test(valor.trim())) {
    const convertido = Number(valor.trim())
    if (Number.isFinite(convertido)) return convertido
  }
  return linhaInvalida(entidade)
}

export function numeroOpcional(
  linha: RegistroBanco,
  coluna: string,
  entidade: string,
): number | null {
  const valor = linha[coluna]
  if (valor === null || valor === undefined) return null
  return numero(linha, coluna, entidade)
}

/** TINYINT(1): 0/1 do driver, ou `boolean` quando o banco é um fake. */
export function booleano(linha: RegistroBanco, coluna: string, entidade: string): boolean {
  const valor = linha[coluna]
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'number' && (valor === 0 || valor === 1)) return valor === 1
  if (ehTexto(valor) && (valor === '0' || valor === '1')) return valor === '1'
  return linhaInvalida(entidade)
}

/** TIMESTAMP → ISO 8601 com timezone. */
export function dataHora(linha: RegistroBanco, coluna: string, entidade: string): string {
  const valor = linha[coluna]
  if (ehData(valor)) return valor.toISOString()
  if (ehTexto(valor) && ISO_DATA_HORA.test(valor.trim())) {
    const data = new Date(valor.trim())
    if (!Number.isNaN(data.getTime())) return data.toISOString()
  }
  return linhaInvalida(entidade)
}

export function dataHoraOpcional(
  linha: RegistroBanco,
  coluna: string,
  entidade: string,
): string | null {
  const valor = linha[coluna]
  if (valor === null || valor === undefined) return null
  return dataHora(linha, coluna, entidade)
}

/** DATE → `YYYY-MM-DD`, sem conversão de fuso horário. */
export function dataApenas(linha: RegistroBanco, coluna: string, entidade: string): string {
  const valor = linha[coluna]
  if (ehTexto(valor)) {
    const partes = ISO_DATA.exec(valor)
    if (partes && dataValida(Number(partes[1]), Number(partes[2]), Number(partes[3]))) {
      return valor
    }
  }
  if (ehData(valor)) {
    // mysql2 entrega DATE como meia-noite local; `new Date('YYYY-MM-DD')` é meia-noite UTC.
    const utcMeiaNoite =
      valor.getUTCHours() === 0 &&
      valor.getUTCMinutes() === 0 &&
      valor.getUTCSeconds() === 0 &&
      valor.getUTCMilliseconds() === 0
    const ano = utcMeiaNoite ? valor.getUTCFullYear() : valor.getFullYear()
    const mes = (utcMeiaNoite ? valor.getUTCMonth() : valor.getMonth()) + 1
    const dia = utcMeiaNoite ? valor.getUTCDate() : valor.getDate()
    if (dataValida(ano, mes, dia)) {
      return `${String(ano).padStart(4, '0')}-${doisDigitos(mes)}-${doisDigitos(dia)}`
    }
  }
  return linhaInvalida(entidade)
}

function dataValida(ano: number, mes: number, dia: number): boolean {
  const data = new Date(Date.UTC(ano, mes - 1, dia))
  return (
    data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia
  )
}

function doisDigitos(valor: number): string {
  return String(valor).padStart(2, '0')
}

/** Domínios fechados: value object lido como texto e validado contra a lista fixa. */
export function textoEnumerado<T extends string>(
  linha: RegistroBanco,
  coluna: string,
  entidade: string,
  valores: readonly T[],
): T {
  const valor = texto(linha, coluna, entidade)
  const encontrado = valores.find((candidato) => candidato === valor)
  if (encontrado === undefined) linhaInvalida(entidade)
  return encontrado
}

export function textoEnumeradoOpcional<T extends string>(
  linha: RegistroBanco,
  coluna: string,
  entidade: string,
  valores: readonly T[],
): T | null {
  const valor = textoOpcional(linha, coluna, entidade)
  if (valor === null) return null
  const encontrado = valores.find((candidato) => candidato === valor)
  if (encontrado === undefined) linhaInvalida(entidade)
  return encontrado
}
