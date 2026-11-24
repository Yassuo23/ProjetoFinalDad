import { describe, expect, it } from 'vitest'
import {
  esquemaClienteAtualizar,
  esquemaClienteCriar,
  esquemaClienteListar,
  esquemaConsultarCep,
  esquemaEquipamentoAtualizar,
  esquemaEquipamentoListarDisponiveis,
} from './esquemas'

describe('schemas do contrato', () => {
  it('aceita cliente válido com CEP hifenizado e e-mail', () => {
    expect(
      esquemaClienteCriar.safeParse({
        nome: 'Ana',
        email: 'ana@example.com',
        cep: '01001-000',
        uf: 'SP',
      }).success,
    ).toBe(true)
    expect(esquemaConsultarCep.safeParse({ cep: '01001000' }).success).toBe(true)
  })

  it('rejeita CEP, e-mail e UF inválidos', () => {
    expect(esquemaConsultarCep.safeParse({ cep: 'abc' }).success).toBe(false)
    expect(esquemaClienteCriar.safeParse({ nome: 'Ana', email: 'invalido' }).success).toBe(false)
    expect(esquemaClienteCriar.safeParse({ nome: 'Ana', uf: 'Sao Paulo' }).success).toBe(false)
  })

  it('aceita filtros vazios e exige id na atualização', () => {
    expect(esquemaClienteListar.safeParse(undefined).success).toBe(true)
    expect(esquemaClienteAtualizar.safeParse({ nome: 'Ana' }).success).toBe(false)
    expect(esquemaClienteAtualizar.safeParse({ id: 1, nome: 'Ana' }).success).toBe(true)
  })

  it('continua rejeitando estado de equipamento e período invertido', () => {
    expect(esquemaEquipamentoAtualizar.safeParse({ id: 1, estado: 'quebrado' }).success).toBe(false)
    expect(
      esquemaEquipamentoListarDisponiveis.safeParse({
        inicio: '2026-12-02T00:00:00.000Z',
        fim: '2026-12-01T00:00:00.000Z',
      }).success,
    ).toBe(false)
  })
})
