import { describe, expect, it } from 'vitest'
import { esquemaCriarCheckoutStripe, esquemaListarClientes } from './esquemas'

describe('esquemaCriarCheckoutStripe', () => {
  const valido = {
    tipo: 'reserva',
    valorCentavos: 33_000,
    descricao: 'Reserva #1042',
    forma: 'cartao',
  }

  it('aceita o payload mínimo', () => {
    expect(esquemaCriarCheckoutStripe.safeParse(valido).success).toBe(true)
  })

  it('rejeita valor fracionário, forma desconhecida e campos extras', () => {
    expect(esquemaCriarCheckoutStripe.safeParse({ ...valido, valorCentavos: 330.5 }).success).toBe(
      false,
    )
    expect(esquemaCriarCheckoutStripe.safeParse({ ...valido, forma: 'boleto' }).success).toBe(false)
    expect(
      esquemaCriarCheckoutStripe.safeParse({ ...valido, chaveSecreta: 'sk_test' }).success,
    ).toBe(false)
  })
})

describe('esquemaListarClientes', () => {
  it('aceita chamada sem parâmetros e filtros opcionais', () => {
    expect(esquemaListarClientes.safeParse(undefined).success).toBe(true)
    expect(esquemaListarClientes.safeParse({ busca: 'ana', limite: 10 }).success).toBe(true)
  })

  it('rejeita limite fora da faixa e campos extras', () => {
    expect(esquemaListarClientes.safeParse({ limite: 0 }).success).toBe(false)
    expect(esquemaListarClientes.safeParse({ busca: 'ana', pagina: 2 }).success).toBe(false)
  })
})
