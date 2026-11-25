/**
 * Formatação pt-BR de apresentação. Classe pura: sem DOM, IPC, efeito colateral
 * ou regra de negócio. Entrada inválida nunca lança — devolve o traço editorial.
 */
const TRACO = '—'
const MAX_CPF = 11
const MAX_CNPJ = 14
const MAX_CEP = 8
const MAX_TELEFONE = 11

const PESOS_DV1_CNPJ: readonly number[] = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
const PESOS_DV2_CNPJ: readonly number[] = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

export class FormatadorPtBr {
  private readonly formatadorMoeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  /** Remove toda pontuação — uso exclusivo de apresentação, nunca de contrato. */
  digitos(valor: string): string {
    return valor.replace(/\D/g, '')
  }

  /** Intl pt-BR usa espaço inquebrável após R$; normalizamos para o espaço do DS. */
  moeda(valor: number): string {
    if (!Number.isFinite(valor)) {
      return TRACO
    }
    return this.formatadorMoeda.format(valor).replace(/\u00a0/g, ' ')
  }

  /** Aceita ISO `aaaa-mm-dd` (com ou sem hora) e `Date`; saída sempre `dd/mm/aaaa`. */
  data(valor: string | Date | null | undefined): string {
    if (valor === null || valor === undefined) {
      return TRACO
    }
    if (valor instanceof Date) {
      return Number.isNaN(valor.getTime())
        ? TRACO
        : this.montarData(valor.getFullYear(), valor.getMonth() + 1, valor.getDate())
    }

    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim().slice(0, 10))
    if (partes === null) {
      return TRACO
    }
    const ano = Number(partes[1])
    const mes = Number(partes[2])
    const dia = Number(partes[3])
    const conferencia = new Date(ano, mes - 1, dia)
    if (
      conferencia.getFullYear() !== ano ||
      conferencia.getMonth() !== mes - 1 ||
      conferencia.getDate() !== dia
    ) {
      return TRACO
    }
    return this.montarData(ano, mes, dia)
  }

  /** DDD + 8 ou 9 dígitos; máscara cresce com a digitação. */
  telefone(valor: string): string {
    const digitos = this.digitos(valor).slice(0, MAX_TELEFONE)
    if (digitos === '') {
      return TRACO
    }
    if (digitos.length <= 2) {
      return digitos
    }
    const ddd = digitos.slice(0, 2)
    const resto = digitos.slice(2)
    if (resto.length <= 4) {
      return `(${ddd}) ${resto}`
    }
    const corte = resto.startsWith('9') ? 5 : 4
    const prefixo = resto.slice(0, corte)
    const sufixo = resto.slice(corte)
    return sufixo === '' ? `(${ddd}) ${prefixo}` : `(${ddd}) ${prefixo}-${sufixo}`
  }

  /** CPF com máscara progressiva; aceita até 11 dígitos. */
  cpf(valor: string): string {
    const digitos = this.digitos(valor).slice(0, MAX_CPF)
    if (digitos === '') {
      return TRACO
    }
    if (digitos.length <= 3) {
      return digitos
    }
    if (digitos.length <= 6) {
      return `${digitos.slice(0, 3)}.${digitos.slice(3)}`
    }
    if (digitos.length <= 9) {
      return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`
    }
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`
  }

  /** CNPJ com máscara progressiva; aceita até 14 dígitos. */
  cnpj(valor: string): string {
    const digitos = this.digitos(valor).slice(0, MAX_CNPJ)
    if (digitos === '') {
      return TRACO
    }
    if (digitos.length <= 2) {
      return digitos
    }
    if (digitos.length <= 5) {
      return `${digitos.slice(0, 2)}.${digitos.slice(2)}`
    }
    if (digitos.length <= 8) {
      return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5)}`
    }
    if (digitos.length <= 12) {
      return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8)}`
    }
    return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`
  }

  /** CEP com máscara progressiva; aceita até 8 dígitos. */
  cep(valor: string): string {
    const digitos = this.digitos(valor).slice(0, MAX_CEP)
    if (digitos === '') {
      return TRACO
    }
    return digitos.length <= 5 ? digitos : `${digitos.slice(0, 5)}-${digitos.slice(5)}`
  }

  /** Validação de dígitos verificadores — apresentação, sem substituir o main. */
  cpfValido(valor: string): boolean {
    const digitos = this.digitos(valor)
    if (digitos.length !== MAX_CPF || /^(\d)\1{10}$/.test(digitos)) {
      return false
    }
    return this.digitoVerificadorCpf(digitos, 9) === digitos[9] &&
      this.digitoVerificadorCpf(digitos, 10) === digitos[10]
  }

  cnpjValido(valor: string): boolean {
    const digitos = this.digitos(valor)
    if (digitos.length !== MAX_CNPJ || /^(\d)\1{13}$/.test(digitos)) {
      return false
    }
    return this.digitoVerificadorCnpj(digitos, PESOS_DV1_CNPJ) === digitos[12] &&
      this.digitoVerificadorCnpj(digitos, PESOS_DV2_CNPJ) === digitos[13]
  }

  private montarData(ano: number, mes: number, dia: number): string {
    return `${String(dia).padStart(2, '0')}/${String(mes).padStart(2, '0')}/${String(ano).padStart(4, '0')}`
  }

  private digitoVerificadorCpf(digitos: string, quantidade: number): string {
    let soma = 0
    let peso = quantidade + 1
    for (let indice = 0; indice < quantidade; indice += 1) {
      soma += Number(digitos[indice]) * peso
      peso -= 1
    }
    const resto = soma % 11
    return String(resto < 2 ? 0 : 11 - resto)
  }

  private digitoVerificadorCnpj(digitos: string, pesos: readonly number[]): string {
    let soma = 0
    for (let indice = 0; indice < pesos.length; indice += 1) {
      soma += Number(digitos[indice]) * pesos[indice]
    }
    const resto = soma % 11
    return String(resto < 2 ? 0 : 11 - resto)
  }
}

export const formatadorPtBr = new FormatadorPtBr()
