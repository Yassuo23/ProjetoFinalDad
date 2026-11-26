import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { ErroDeDominio } from './ErroDeDominio'

/**
 * Hash de senha: `scrypt$<saltHex>$<hashHex>` (16 bytes de salt, 64 bytes de chave).
 * O salt é aleatório e único por registro; a comparação usa `timingSafeEqual`.
 * Nenhuma função desta classe registra a senha ou o hash em log.
 */
const FORMATO = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/
const TAMANHO_SALT = 16
const TAMANHO_CHAVE = 64
/** 128 * N * r = 16 MiB; abaixo do maxmem e fora da thread principal (callback). */
const OPCOES = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const

function derivar(senha: string, salt: Buffer, tamanho: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, tamanho, OPCOES, (erro, chave) => {
      if (erro) reject(erro)
      else resolve(chave)
    })
  })
}

export async function gerarHash(senha: string): Promise<string> {
  const salt = randomBytes(TAMANHO_SALT)
  const chave = await derivar(senha, salt, TAMANHO_CHAVE)
  return `scrypt$${salt.toString('hex')}$${chave.toString('hex')}`
}

/** Retorna `false` para formato inválido sem revelar qual parte falhou. */
export async function conferirSenha(senha: string, armazenado: string): Promise<boolean> {
  const partes = FORMATO.exec(armazenado)
  if (!partes) return false

  const salt = Buffer.from(partes[1] ?? '', 'hex')
  const esperado = Buffer.from(partes[2] ?? '', 'hex')
  const calculado = await derivar(senha, salt, esperado.length)
  return esperado.length === calculado.length && timingSafeEqual(esperado, calculado)
}

/** Política mínima: 8–128 caracteres, com letra e número. */
export function validarPoliticaSenha(senha: string): void {
  if (
    senha.length < 8 ||
    senha.length > 128 ||
    !/[A-Za-z]/.test(senha) ||
    !/\d/.test(senha)
  ) {
    throw new ErroDeDominio(
      'SENHA_FRACA',
      'Senha fraca: use de 8 a 128 caracteres, com letras e números.',
    )
  }
}
