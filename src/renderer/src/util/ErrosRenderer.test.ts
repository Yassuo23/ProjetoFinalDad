import { describe, expect, it } from 'vitest'
import {
  codigoErro,
  mensagemErroOperacao,
  mensagemIntegracao,
} from './ErrosRenderer'

describe('ErrosRenderer', () => {
  it('lê o código estável da message sem confiar em propriedades serializadas', () => {
    expect(codigoErro(new Error('RELACAO_INVALIDA'))).toBe('RELACAO_INVALIDA')
    expect(codigoErro(new Error('CODIGO_INEXISTENTE'))).toBeNull()
    expect(codigoErro({ codigo: 'RELACAO_INVALIDA' })).toBeNull()
  })

  it('explica bloqueio de FK sem expor driver, SQL ou códigos internos', () => {
    const mensagem = mensagemErroOperacao(new Error('RELACAO_INVALIDA'), 'a categoria')
    expect(mensagem).toContain('Não foi possível inativar a categoria')
    expect(mensagem).toContain('registros vinculados')
    expect(mensagem).not.toContain('ER_ROW')
    expect(mensagem).not.toContain('RELACAO_INVALIDA')
  })

  it('traduz duplicidade e período inválido', () => {
    expect(mensagemErroOperacao(new Error('REGISTRO_DUPLICADO'), 'o fornecedor')).toContain(
      'Já existe o fornecedor',
    )
    expect(mensagemErroOperacao(new Error('PERIODO_INVALIDO'), 'a reserva')).toContain(
      'data de fim',
    )
  })

  it('dá fallback seguro para erro desconhecido', () => {
    expect(mensagemErroOperacao(new Error('boom'), 'o item')).toContain('Tente novamente')
  })

  it('distingue não encontrado de serviço fora no ar', () => {
    expect(mensagemIntegracao('SEM_DADOS', 'CNPJ')).toContain('Não encontramos')
    expect(mensagemIntegracao('SERVICO_FORA', 'CNPJ')).toContain('indisponível')
    expect(mensagemIntegracao('CREDENCIAL_AUSENTE', 'feriados')).toContain('desativada')
  })
})
