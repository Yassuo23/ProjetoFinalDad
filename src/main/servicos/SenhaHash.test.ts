import { describe, expect, it } from 'vitest'
import { ErroDeDominio } from './ErroDeDominio'
import { conferirSenha, gerarHash, validarPoliticaSenha } from './SenhaHash'

describe('SenhaHash', () => {
  it('gera hash scrypt com salt e verifica a senha correta', async () => {
    const hash = await gerarHash('Bicicleta2026')

    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/)
    expect(hash).not.toContain('Bicicleta2026')
    await expect(conferirSenha('Bicicleta2026', hash)).resolves.toBe(true)
  })

  it('rejeita senha incorreta e hash com formato inválido', async () => {
    const hash = await gerarHash('Caiaque2026')

    await expect(conferirSenha('Caiaque2027', hash)).resolves.toBe(false)
    await expect(conferirSenha('Caiaque2026', 'texto-puro')).resolves.toBe(false)
  })

  it('usa salt único: a mesma senha gera hashes diferentes', async () => {
    const primeiro = await gerarHash('Camping2026')
    const segundo = await gerarHash('Camping2026')

    expect(primeiro).not.toBe(segundo)
    const saltPrimeiro = primeiro.split('$')[1]
    const saltSegundo = segundo.split('$')[1]
    expect(saltPrimeiro).not.toBe(saltSegundo)
  })

  it('aplica a política mínima com código SENHA_FRACA', () => {
    expect(() => validarPoliticaSenha('fraca')).toThrow(ErroDeDominio)
    try {
      validarPoliticaSenha('123')
    } catch (erro) {
      expect(erro).toBeInstanceOf(ErroDeDominio)
      expect((erro as ErroDeDominio).codigo).toBe('SENHA_FRACA')
      expect((erro as ErroDeDominio).mensagem).not.toContain('123')
    }
    expect(() => validarPoliticaSenha('Bicicleta2026')).not.toThrow()
  })
})
