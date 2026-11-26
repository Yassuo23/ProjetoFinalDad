import { describe, expect, it } from 'vitest'
import { avisoFeriadosIndisponiveis, textoMulta } from './TextosMulta'

describe('TextosMulta', () => {
  it('explica a conta didaticamente com os valores do main', () => {
    expect(textoMulta(2, 20, 40)).toBe(
      '2 dias de atraso × R$ 20,00 = R$ 40,00. Domingos e feriados nacionais não são cobrados.',
    )
  })

  it('usa singular e não cobra atraso zerado', () => {
    expect(textoMulta(1, 20, 20)).toContain('1 dia de atraso')
    expect(textoMulta(0, 20, 0)).toContain('Sem atraso cobrável')
    expect(textoMulta(3, 20, 0)).toContain('Sem atraso cobrável')
  })

  it('aviso de feriado indisponível não bloqueia a devolução', () => {
    const aviso = avisoFeriadosIndisponiveis('feriados')
    expect(aviso).toContain('domingos')
    expect(aviso).toContain('devolução continua disponível')
  })
})
