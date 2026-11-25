import type { PoolOptions } from 'mysql2/promise'

function variavelObrigatoria(env: NodeJS.ProcessEnv, nome: string): string {
  const valor = env[nome]?.trim()
  if (!valor) throw new Error(`Configure a variável ${nome} no arquivo .env`)
  return valor
}

export function lerConfiguracaoBanco(env: NodeJS.ProcessEnv = process.env): PoolOptions {
  const host = variavelObrigatoria(env, 'DB_HOST')
  const database = variavelObrigatoria(env, 'DB_NAME')
  const user = variavelObrigatoria(env, 'DB_USER')
  const password = variavelObrigatoria(env, 'DB_PASSWORD')
  const portaTexto = variavelObrigatoria(env, 'DB_PORT')
  const port = Number(portaTexto)

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT precisa ser um número inteiro entre 1 e 65535')
  }

  const sslTexto = env.DB_SSL?.trim().toLowerCase() || 'false'
  if (sslTexto !== 'true' && sslTexto !== 'false') {
    throw new Error('DB_SSL precisa ser true ou false')
  }

  return {
    host,
    port,
    database,
    user,
    password,
    charset: 'utf8mb4',
    ...(sslTexto === 'true'
      ? { ssl: { rejectUnauthorized: true, verifyIdentity: true } }
      : {}),
  }
}
