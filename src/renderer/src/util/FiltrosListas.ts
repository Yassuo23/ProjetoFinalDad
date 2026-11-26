/**
 * Filtros e ordenação puros das listas. Nenhuma regra de negócio: apenas
 * apresentação, com comparação insensível a acento e caixa.
 */
export type DirecaoOrdenacao = 'asc' | 'desc'

function normalizar(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return ''
  }
  if (valor instanceof Date) {
    return valor.toISOString()
  }
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

export function contemTexto(valor: unknown, termo: string): boolean {
  const agulha = normalizar(termo).trim()
  if (agulha === '') {
    return true
  }
  return normalizar(valor).includes(agulha)
}

export function filtrarPorTexto<T>(
  itens: readonly T[],
  campos: readonly (keyof T & string)[],
  termo: string,
): readonly T[] {
  if (normalizar(termo).trim() === '') {
    return itens
  }
  return itens.filter((item) => campos.some((campo) => contemTexto(item[campo], termo)))
}

export function filtrarPorStatus<T>(
  itens: readonly T[],
  campo: keyof T & string,
  status: string,
): readonly T[] {
  if (status === '') {
    return itens
  }
  return itens.filter((item) => normalizar(item[campo]) === normalizar(status))
}

export function filtrarPorPeriodo<T>(
  itens: readonly T[],
  campoInicio: keyof T & string,
  campoFim: keyof T & string,
  inicio: string,
  fim: string,
): readonly T[] {
  if (inicio === '' && fim === '') {
    return itens
  }
  return itens.filter((item) => {
    const inicioItem = normalizar(item[campoInicio]).slice(0, 10)
    const fimItem = normalizar(item[campoFim]).slice(0, 10)
    if (inicio !== '' && fimItem !== '' && fimItem < inicio) {
      return false
    }
    if (fim !== '' && inicioItem !== '' && inicioItem > fim) {
      return false
    }
    return true
  })
}

export function ordenarPor<T>(
  itens: readonly T[],
  campo: keyof T & string,
  direcao: DirecaoOrdenacao = 'asc',
): readonly T[] {
  const fator = direcao === 'asc' ? 1 : -1
  return [...itens].sort((a, b) => {
    const esquerda = a[campo]
    const direita = b[campo]
    if (typeof esquerda === 'number' && typeof direita === 'number') {
      return fator * (esquerda - direita)
    }
    return (
      fator *
      normalizar(esquerda).localeCompare(normalizar(direita), 'pt-BR', {
        numeric: true,
        sensitivity: 'base',
      })
    )
  })
}
