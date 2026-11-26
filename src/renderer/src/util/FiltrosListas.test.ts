import { describe, expect, it } from 'vitest'
import { filtrarPorPeriodo, filtrarPorStatus, filtrarPorTexto, ordenarPor } from './FiltrosListas'

interface Linha {
  readonly nome: string
  readonly status: string
  readonly inicio: string
  readonly fim: string
}

const LINHAS: readonly Linha[] = [
  { nome: 'Água', status: 'Pago', inicio: '2026-11-20', fim: '2026-11-22' },
  { nome: 'Bicicleta', status: 'Pendente', inicio: '2026-11-24', fim: '2026-11-26' },
  { nome: 'Caiaque', status: 'Pago', inicio: '2026-11-27', fim: '2026-11-29' },
]

describe('FiltrosListas', () => {
  it('busca ignorando acento e caixa', () => {
    expect(filtrarPorTexto(LINHAS, ['nome'], 'agua').map((item) => item.nome)).toEqual(['Água'])
    expect(filtrarPorTexto(LINHAS, ['nome'], '')).toHaveLength(3)
  })

  it('filtra por status exato', () => {
    expect(filtrarPorStatus(LINHAS, 'status', 'Pago')).toHaveLength(2)
    expect(filtrarPorStatus(LINHAS, 'status', '')).toHaveLength(3)
  })

  it('filtra por período considerando sobreposição', () => {
    expect(filtrarPorPeriodo(LINHAS, 'inicio', 'fim', '2026-11-25', '2026-11-25')).toEqual([
      LINHAS[1],
    ])
    expect(filtrarPorPeriodo(LINHAS, 'inicio', 'fim', '', '')).toHaveLength(3)
  })

  it('ordena sem mutar a entrada', () => {
    const ordem = ordenarPor(LINHAS, 'nome', 'asc').map((item) => item.nome)
    expect(ordem).toEqual(['Água', 'Bicicleta', 'Caiaque'])
    expect(LINHAS[0]?.nome).toBe('Água')
    expect(ordenarPor(LINHAS, 'nome', 'desc').map((item) => item.nome)[0]).toBe('Caiaque')
  })
})
