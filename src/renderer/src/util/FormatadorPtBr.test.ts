import { describe, expect, it } from 'vitest'
import { formatadorPtBr } from './FormatadorPtBr'

describe('FormatadorPtBr', () => {
  describe('moeda', () => {
    it('aplica R$, milhar e duas casas decimais', () => {
      expect(formatadorPtBr.moeda(1234.56)).toBe('R$ 1.234,56')
      expect(formatadorPtBr.moeda(90)).toBe('R$ 90,00')
      expect(formatadorPtBr.moeda(0)).toBe('R$ 0,00')
    })

    it('não produz valor financeiro a partir de entrada inválida', () => {
      expect(formatadorPtBr.moeda(Number.NaN)).toBe('—')
      expect(formatadorPtBr.moeda(Number.POSITIVE_INFINITY)).toBe('—')
    })
  })

  describe('data', () => {
    it('converte ISO para dd/mm/aaaa sem deslocar o fuso', () => {
      expect(formatadorPtBr.data('2026-11-25')).toBe('25/11/2026')
      expect(formatadorPtBr.data('2026-11-25T23:30:00Z')).toBe('25/11/2026')
      expect(formatadorPtBr.data('2026-01-02T00:30:00-03:00')).toBe('02/01/2026')
    })

    it('aceita Date usando componentes locais', () => {
      expect(formatadorPtBr.data(new Date(2026, 0, 2, 12))).toBe('02/01/2026')
    })

    it('devolve traço para datas inválidas ou ausentes', () => {
      expect(formatadorPtBr.data('2026-02-30')).toBe('—')
      expect(formatadorPtBr.data('25/11/2026')).toBe('—')
      expect(formatadorPtBr.data('')).toBe('—')
      expect(formatadorPtBr.data(null)).toBe('—')
      expect(formatadorPtBr.data(undefined)).toBe('—')
    })
  })

  describe('telefone', () => {
    it('mascara fixo e celular completos', () => {
      expect(formatadorPtBr.telefone('1133334444')).toBe('(11) 3333-4444')
      expect(formatadorPtBr.telefone('11987654321')).toBe('(11) 98765-4321')
      expect(formatadorPtBr.telefone('(11) 98765-4321')).toBe('(11) 98765-4321')
    })

    it('cresce com máscaras parciais', () => {
      expect(formatadorPtBr.telefone('11')).toBe('11')
      expect(formatadorPtBr.telefone('119')).toBe('(11) 9')
      expect(formatadorPtBr.telefone('1198765')).toBe('(11) 98765')
      expect(formatadorPtBr.telefone('11333')).toBe('(11) 333')
    })

    it('limita a 11 dígitos e devolve traço quando não há dígitos', () => {
      expect(formatadorPtBr.telefone('119876543219999')).toBe('(11) 98765-4321')
      expect(formatadorPtBr.telefone('abc')).toBe('—')
    })
  })

  describe('cpf', () => {
    it('mascara os 11 dígitos', () => {
      expect(formatadorPtBr.cpf('52998224725')).toBe('529.982.247-25')
      expect(formatadorPtBr.cpf('529.982.247-25')).toBe('529.982.247-25')
    })

    it('mantém máscaras parciais sem inventar dígitos', () => {
      expect(formatadorPtBr.cpf('529')).toBe('529')
      expect(formatadorPtBr.cpf('529982')).toBe('529.982')
      expect(formatadorPtBr.cpf('529982247')).toBe('529.982.247')
      expect(formatadorPtBr.cpf('')).toBe('—')
    })

    it('valida dígitos verificadores', () => {
      expect(formatadorPtBr.cpfValido('529.982.247-25')).toBe(true)
      expect(formatadorPtBr.cpfValido('52998224726')).toBe(false)
      expect(formatadorPtBr.cpfValido('111.111.111-11')).toBe(false)
      expect(formatadorPtBr.cpfValido('123')).toBe(false)
    })
  })

  describe('cnpj', () => {
    it('mascara os 14 dígitos', () => {
      expect(formatadorPtBr.cnpj('11444777000161')).toBe('11.444.777/0001-61')
      expect(formatadorPtBr.cnpj('11.444.777/0001-61')).toBe('11.444.777/0001-61')
    })

    it('mantém máscaras parciais sem inventar dígitos', () => {
      expect(formatadorPtBr.cnpj('11')).toBe('11')
      expect(formatadorPtBr.cnpj('11444')).toBe('11.444')
      expect(formatadorPtBr.cnpj('11444777')).toBe('11.444.777')
      expect(formatadorPtBr.cnpj('114447770001')).toBe('11.444.777/0001')
      expect(formatadorPtBr.cnpj('')).toBe('—')
    })

    it('valida dígitos verificadores', () => {
      expect(formatadorPtBr.cnpjValido('11.444.777/0001-61')).toBe(true)
      expect(formatadorPtBr.cnpjValido('11444777000162')).toBe(false)
      expect(formatadorPtBr.cnpjValido('00.000.000/0000-00')).toBe(false)
      expect(formatadorPtBr.cnpjValido('11444')).toBe(false)
    })
  })

  describe('cep', () => {
    it('mascara os 8 dígitos', () => {
      expect(formatadorPtBr.cep('01310100')).toBe('01310-100')
      expect(formatadorPtBr.cep('01310-100')).toBe('01310-100')
    })

    it('mantém máscaras parciais e devolve traço para entrada vazia', () => {
      expect(formatadorPtBr.cep('013')).toBe('013')
      expect(formatadorPtBr.cep('01310')).toBe('01310')
      expect(formatadorPtBr.cep('abcdef')).toBe('—')
    })
  })

  describe('digitos', () => {
    it('remove pontuação sem alterar a ordem', () => {
      expect(formatadorPtBr.digitos('(11) 98765-4321')).toBe('11987654321')
      expect(formatadorPtBr.digitos('529.982.247-25')).toBe('52998224725')
    })
  })
})
