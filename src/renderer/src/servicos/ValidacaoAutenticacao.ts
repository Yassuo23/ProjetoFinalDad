/**
 * Validação de apresentação: espelha a política do main para dar feedback
 * imediato em pt-BR antes do IPC. A decisão final continua no processo principal.
 */

const LOGIN_MIN = 3
const LOGIN_MAX = 80
const SENHA_MIN = 8
const SENHA_MAX = 128
const NOME_MAX = 150

export function nomeValido(nome: string): boolean {
  const texto = nome.trim()
  return texto.length >= 1 && texto.length <= NOME_MAX
}

export function loginValido(login: string): boolean {
  const texto = login.trim()
  return texto.length >= LOGIN_MIN && texto.length <= LOGIN_MAX
}

export function senhaValida(senha: string): boolean {
  return (
    senha.length >= SENHA_MIN &&
    senha.length <= SENHA_MAX &&
    /[A-Za-z]/.test(senha) &&
    /\d/.test(senha)
  )
}

export const TEXTO_POLITICA_SENHA = 'Use no mínimo 8 caracteres, com letra e número.'
export const TEXTO_POLITICA_LOGIN = 'O login precisa de pelo menos 3 caracteres.'
