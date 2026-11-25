import type { CodigoErroDominio, ErroDominio } from '../../shared/contratos/modelos'

/**
 * Erro de domínio e tradução de erros do driver.
 *
 * Mora em `banco/` para que repositórios e serviços possam usá-lo sem quebrar
 * a regra de dependência (repositório nunca importa serviço).
 */
export class ErroDeDominio extends Error implements ErroDominio {
  readonly codigo: CodigoErroDominio
  readonly mensagem: string

  constructor(codigo: CodigoErroDominio, mensagem: string) {
    super(codigo)
    this.name = 'ErroDeDominio'
    this.codigo = codigo
    this.mensagem = mensagem
  }
}

/** Converte erros do driver em códigos estáveis; nunca expõe SQL ao renderer. */
export function paraErroDominio(erro: unknown, contexto: string): ErroDeDominio {
  if (erro instanceof ErroDeDominio) return erro

  const codigo = codigoMysql(erro)
  if (codigo === 'ER_DUP_ENTRY') {
    return new ErroDeDominio('REGISTRO_DUPLICADO', `${contexto} já está cadastrado(a).`)
  }
  if (codigo === 'ER_NO_REFERENCED_ROW_2' || codigo === 'ER_ROW_IS_REFERENCED_2') {
    return new ErroDeDominio('RELACAO_INVALIDA', `${contexto} possui vínculos que impedem a operação.`)
  }

  return new ErroDeDominio('DADOS_INVALIDOS', `Não foi possível concluir a operação com ${contexto}.`)
}

function codigoMysql(erro: unknown): string | null {
  if (typeof erro !== 'object' || erro === null || !('code' in erro)) return null
  const valor = (erro as { code: unknown }).code
  return typeof valor === 'string' ? valor : null
}
