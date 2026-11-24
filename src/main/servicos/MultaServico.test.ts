import { describe, expect, it } from 'vitest'
import { CARENCIA_DIAS, MultaServico, TAXA_DIARIA, TETO_PERCENTUAL } from './MultaServico'

const FIM = '2026-12-05T00:00:00.000Z'

function emDias(quantidade: number): string {
  return new Date(Date.parse(FIM) + quantidade * 86_400_000).toISOString()
}

const PADRAO = {
  fim: FIM,
  valorAquisicao: 1000,
  precoDiaria: 80,
  diasReserva: 4,
}

describe('MultaServico', () => {
  it('exporta os parâmetros fechados na ADR 0010', () => {
    expect(CARENCIA_DIAS).toBe(90)
    expect(TAXA_DIARIA).toBe(0.005)
    expect(TETO_PERCENTUAL).toBe(0.2)
  })

  it('não cobra nada quando devolvido no fim da reserva', () => {
    const calculo = new MultaServico().calcular({ ...PADRAO, devolvidoEm: FIM })

    expect(calculo).toEqual({
      diasAtraso: 0,
      diasCarencia: 90,
      valorDiaria: 80,
      valorLocacao: 320,
      baseCalculo: 1000,
      percentualDiario: 0.005,
      valorMultaBruta: 0,
      valorMulta: 0,
      valorTotal: 320,
      tetoAplicado: false,
    })
  })

  it('respeita a carência de 90 dias', () => {
    const servico = new MultaServico()

    expect(servico.calcular({ ...PADRAO, devolvidoEm: emDias(89) }).diasAtraso).toBe(0)
    expect(servico.calcular({ ...PADRAO, devolvidoEm: emDias(90) }).diasAtraso).toBe(0)
    expect(servico.calcular({ ...PADRAO, devolvidoEm: emDias(91) }).diasAtraso).toBe(1)
  })

  it('aplica a taxa proporcional aos dias de atraso', () => {
    const calculo = new MultaServico().calcular({ ...PADRAO, devolvidoEm: emDias(100) })

    expect(calculo.diasAtraso).toBe(10)
    expect(calculo.valorLocacao).toBe(320)
    expect(calculo.valorMultaBruta).toBe(50)
    expect(calculo.valorMulta).toBe(50)
    expect(calculo.valorTotal).toBe(370)
    expect(calculo.tetoAplicado).toBe(false)
  })

  it('aplica o teto de 20% da locação quando a bruta o excede', () => {
    const calculo = new MultaServico().calcular({ ...PADRAO, devolvidoEm: emDias(200) })

    expect(calculo.diasAtraso).toBe(110)
    expect(calculo.valorMultaBruta).toBe(550)
    expect(calculo.valorMulta).toBe(64)
    expect(calculo.valorTotal).toBe(384)
    expect(calculo.tetoAplicado).toBe(true)
  })

  it('calcula zero sem ainda assim devolver a estrutura quando a base é zero', () => {
    const calculo = new MultaServico().calcular({
      ...PADRAO,
      valorAquisicao: 0,
      devolvidoEm: emDias(200),
    })

    expect(calculo.baseCalculo).toBe(0)
    expect(calculo.valorMultaBruta).toBe(0)
    expect(calculo.valorMulta).toBe(0)
    expect(calculo.valorTotal).toBe(320)
    expect(calculo.tetoAplicado).toBe(false)
  })

  it('arredonda em centavos e admite parâmetros configuráveis', () => {
    const servico = new MultaServico(10, 0.01, 0.1)
    const calculo = servico.calcular({
      ...PADRAO,
      valorAquisicao: 999.99,
      devolvidoEm: emDias(11),
    })

    expect(calculo.diasCarencia).toBe(10)
    expect(calculo.percentualDiario).toBe(0.01)
    expect(calculo.diasAtraso).toBe(1)
    expect(calculo.valorMultaBruta).toBe(10)
    expect(calculo.valorMulta).toBe(10)
    expect(calculo.valorTotal).toBe(330)
  })

  it('trata devolução anterior ao fim como sem atraso', () => {
    const calculo = new MultaServico().calcular({ ...PADRAO, devolvidoEm: emDias(-5) })

    expect(calculo.diasAtraso).toBe(0)
    expect(calculo.valorMulta).toBe(0)
  })
})
