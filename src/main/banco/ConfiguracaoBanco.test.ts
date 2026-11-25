import { describe, expect, it } from 'vitest'
import { lerConfiguracaoBanco } from './ConfiguracaoBanco'

const ambienteValido: NodeJS.ProcessEnv = {
  DB_HOST: '192.168.1.20',
  DB_PORT: '3306',
  DB_NAME: 'zenite',
  DB_USER: 'app',
  DB_PASSWORD: 'senha-local',
}

describe('lerConfiguracaoBanco', () => {
  it('lê os parâmetros MySQL do ambiente', () => {
    expect(lerConfiguracaoBanco(ambienteValido)).toEqual({
      host: '192.168.1.20',
      port: 3306,
      database: 'zenite',
      user: 'app',
      password: 'senha-local',
      charset: 'utf8mb4',
    })
  })

  it('habilita TLS com validação do certificado quando configurado', () => {
    expect(lerConfiguracaoBanco({ ...ambienteValido, DB_SSL: 'true' }).ssl).toEqual({
      rejectUnauthorized: true,
      verifyIdentity: true,
    })
  })

  it('rejeita porta inválida ou variável obrigatória ausente', () => {
    expect(() => lerConfiguracaoBanco({ ...ambienteValido, DB_PORT: '70000' })).toThrow(
      'DB_PORT',
    )
    expect(() => lerConfiguracaoBanco({ ...ambienteValido, DB_PASSWORD: '' })).toThrow(
      'DB_PASSWORD',
    )
  })
})
