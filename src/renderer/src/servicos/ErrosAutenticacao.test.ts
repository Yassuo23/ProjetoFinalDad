import { describe, expect, it } from 'vitest'
import {
  mensagemErroBootstrap,
  mensagemErroEntrada,
  motivoErroAutenticacao,
} from './ErrosAutenticacao'

function erroComCodigo(codigo: string): Error {
  return new Error(codigo)
}

describe('ErrosAutenticacao', () => {
  it('mantém uma única mensagem para credenciais inválidas e erro desconhecido', () => {
    expect(mensagemErroEntrada(motivoErroAutenticacao(erroComCodigo('CREDENCIAIS_INVALIDAS')))).toBe(
      'Usuário ou senha inválidos.',
    )
    expect(mensagemErroEntrada(motivoErroAutenticacao(new Error('falha desconhecida')))).toBe(
      'Usuário ou senha inválidos.',
    )
    expect(mensagemErroEntrada(motivoErroAutenticacao('texto'))).toBe(
      'Usuário ou senha inválidos.',
    )
  })

  it('mostra bloqueio quando o main passa a sinalizar tentativas', () => {
    expect(motivoErroAutenticacao(erroComCodigo('USUARIO_BLOQUEADO'))).toBe('bloqueio')
    expect(mensagemErroEntrada('bloqueio')).toBe(
      'Muitas tentativas incorretas. Aguarde um minuto e tente novamente.',
    )
  })

  it('traduz códigos de validação do bootstrap', () => {
    expect(mensagemErroBootstrap(motivoErroAutenticacao(erroComCodigo('SENHA_FRACA')))).toBe(
      'Use no mínimo 8 caracteres, com letra e número.',
    )
    expect(mensagemErroBootstrap(motivoErroAutenticacao(erroComCodigo('LOGIN_DUPLICADO')))).toBe(
      'Este usuário já existe. Escolha outro login.',
    )
    expect(
      mensagemErroBootstrap(motivoErroAutenticacao(erroComCodigo('BOOTSTRAP_JA_REALIZADO'))),
    ).toBe('Já existe um administrador. Entre normalmente.')
  })
})
