import { describe, expect, it } from 'vitest'
import type { RespostaCep } from '../../../shared/contratos/modelos'
import { interpretarRespostaCep } from './InterpretadorCep'

describe('interpretarRespostaCep — estados exibidos pela tela de clientes', () => {
  it('disponivel devolve os quatro campos do endereço', () => {
    const resposta: RespostaCep = {
      estado: 'disponivel',
      endereco: {
        cep: '01001000',
        logradouro: 'Praça da Sé',
        bairro: 'Centro',
        cidade: 'São Paulo',
        uf: 'SP',
      },
    }

    expect(interpretarRespostaCep(resposta)).toEqual(resposta)
  })

  it('nao-encontrado avisa para preencher manualmente sem fornecer endereço', () => {
    const resultado = interpretarRespostaCep({ estado: 'nao-encontrado', cep: '00000000' })

    expect(resultado).toMatchObject({ estado: 'nao-encontrado' })
    expect(resultado).not.toHaveProperty('endereco')
    if (resultado.estado !== 'disponivel') {
      expect(resultado.aviso.mensagem).toContain('CEP não encontrado')
      expect(resultado.aviso.mensagem).toContain('manualmente')
    }
  })

  it('indisponivel mostra o motivo e mantém o preenchimento manual', () => {
    const resultado = interpretarRespostaCep({
      estado: 'indisponivel',
      cep: '01001000',
      motivo: 'SERVICO_FORA',
    })

    expect(resultado).toMatchObject({ estado: 'indisponivel', motivo: 'SERVICO_FORA' })
    expect(resultado).not.toHaveProperty('endereco')
    if (resultado.estado === 'indisponivel') {
      expect(resultado.aviso.mensagem).toContain('SERVICO_FORA')
      expect(resultado.aviso.mensagem).toContain('manualmente')
    }
  })
})
