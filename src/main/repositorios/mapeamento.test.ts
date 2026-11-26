import { describe, expect, it } from 'vitest'
import { dataHoraSql } from './mapeamento'

describe('dataHoraSql — escrita em TIMESTAMP', () => {
  it('converte ISO 8601 para o formato aceito pelo MySQL', () => {
    expect(dataHoraSql('2026-01-13T12:34:56.789Z')).toBe('2026-01-13 12:34:56')
  })

  it('preserva valor já formatado', () => {
    expect(dataHoraSql('2026-01-13 12:34:56')).toBe('2026-01-13 12:34:56')
  })

  it('preserva nulo e ausência', () => {
    expect(dataHoraSql(null)).toBeNull()
    expect(dataHoraSql(undefined)).toBeUndefined()
  })

  it('não altera inválido — o driver traduz o erro', () => {
    expect(dataHoraSql('nao-e-data')).toBe('nao-e-data')
  })
})
