import { describe, expect, it } from 'vitest'
import { CLIENTES_FICTICIOS, filtrarClientes } from './dados'

describe('mock de clientes fictícios', () => {
  it('oferece cadastros com os campos do wireframe 3.4', () => {
    expect(CLIENTES_FICTICIOS.length).toBeGreaterThanOrEqual(5)
    for (const cliente of CLIENTES_FICTICIOS) {
      expect(cliente.nome).not.toBe('')
      expect(cliente.telefone).not.toBe('')
      expect(cliente.cidade).not.toBe('')
      expect(cliente.uf).toHaveLength(2)
    }
  })

  it('busca sem acento por nome, cidade e telefone', () => {
    expect(filtrarClientes(CLIENTES_FICTICIOS, { busca: 'sao paulo' }).map((c) => c.id)).toEqual([
      1,
    ])
    expect(filtrarClientes(CLIENTES_FICTICIOS, { busca: 'campinas' })[0]?.nome).toBe(
      'Beatriz Nunes',
    )
    expect(filtrarClientes(CLIENTES_FICTICIOS, { busca: 'joana' })[0]?.nome).toBe('Joana Ribeiro')
    expect(filtrarClientes(CLIENTES_FICTICIOS, { busca: '98888' })[0]?.nome).toBe('Ana Souza')
  })

  it('aplica limite sem alterar a lista original', () => {
    const resultado = filtrarClientes(CLIENTES_FICTICIOS, { limite: 3 })
    expect(resultado).toHaveLength(3)
    expect(CLIENTES_FICTICIOS).toHaveLength(10)
  })
})
