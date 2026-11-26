import type { CadastrarClienteEntrada } from '../../../shared/contratos/modelos'
import { formatadorPtBr } from '../util'
import {
  TEXTO_POLITICA_LOGIN,
  TEXTO_POLITICA_SENHA,
  loginValido,
  nomeValido,
  senhaValida,
} from './ValidacaoAutenticacao'

/**
 * Feedback imediato em pt-BR. A decisão final continua no processo principal:
 * aqui nunca se rejects um cadastro, apenas se aponta o que revisar antes do IPC.
 */
export interface DadosFormularioCadastroCliente extends CadastrarClienteEntrada {
  readonly confirmarSenha: string
}

export interface ErrosCadastroCliente {
  nome?: string
  cpf?: string
  login?: string
  senha?: string
  confirmarSenha?: string
  telefone?: string
  email?: string
  cep?: string
  uf?: string
}

const EMAIL_PADRAO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const UF_PADRAO = /^[A-Z]{2}$/

function textoOuNulo(valor: string): string | null {
  const texto = valor.trim()
  return texto === '' ? null : texto
}

export function validarCadastroCliente(
  dados: DadosFormularioCadastroCliente,
): ErrosCadastroCliente {
  const erros: ErrosCadastroCliente = {}

  if (!nomeValido(dados.nome)) {
    erros.nome = 'Informe seu nome completo.'
  }
  if (!formatadorPtBr.cpfValido(dados.cpf)) {
    erros.cpf = 'Informe um CPF válido.'
  }
  if (!loginValido(dados.login)) {
    erros.login = TEXTO_POLITICA_LOGIN
  }
  if (!senhaValida(dados.senha)) {
    erros.senha = TEXTO_POLITICA_SENHA
  }
  if (dados.confirmarSenha !== dados.senha) {
    erros.confirmarSenha = 'As senhas não coincidem.'
  }

  const telefone = textoOuNulo(dados.telefone ?? '')
  if (telefone !== null) {
    const digitos = formatadorPtBr.digitos(telefone)
    if (digitos.length !== 10 && digitos.length !== 11) {
      erros.telefone = 'Informe um telefone com DDD.'
    }
  }

  const email = textoOuNulo(dados.email ?? '')
  if (email !== null && !EMAIL_PADRAO.test(email)) {
    erros.email = 'Informe um e-mail válido.'
  }

  const cep = textoOuNulo(dados.cep ?? '')
  if (cep !== null && formatadorPtBr.digitos(cep).length !== 8) {
    erros.cep = 'Informe um CEP com 8 dígitos.'
  }

  const uf = textoOuNulo(dados.uf ?? '')
  if (uf !== null && !UF_PADRAO.test(uf.toUpperCase())) {
    erros.uf = 'Use a sigla do estado com 2 letras.'
  }

  return erros
}

export function temErrosCadastroCliente(erros: ErrosCadastroCliente): boolean {
  return Object.keys(erros).length > 0
}
