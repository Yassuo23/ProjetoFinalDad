import { describe, expect, it } from 'vitest'
import { escaparCelulaCsv, linhaCsv } from './Csv'

describe('escaparCelulaCsv', () => {
  it('delimita texto e dobra aspas', () => {
    expect(escaparCelulaCsv('camping')).toBe('"camping"')
    expect(escaparCelulaCsv('Barraca "Tri"')).toBe('"Barraca ""Tri"""')
  })

  it('neutraliza formula injection mesmo após espaços', () => {
    expect(escaparCelulaCsv('=SUM(A1:A9)')).toBe('"\'=SUM(A1:A9)"')
    expect(escaparCelulaCsv('  +cmd')).toBe('"\'  +cmd"')
    expect(escaparCelulaCsv('@import')).toBe('"\'@import"')
    expect(escaparCelulaCsv('-2')).toBe('"\'-2"')
  })

  it('mantém tipos simples e nulo sem conteúdo', () => {
    expect(escaparCelulaCsv(null)).toBe('')
    expect(escaparCelulaCsv(42)).toBe('"42"')
    expect(escaparCelulaCsv(true)).toBe('"true"')
  })
})

describe('linhaCsv', () => {
  it('junta as células com vírgula', () => {
    expect(linhaCsv(['Equipamento', null, 3])).toBe('"Equipamento",,"3"')
  })
})
