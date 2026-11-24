import type { CodigoErroDominio, ErroDominio } from '../../shared/contratos/modelos'

/**
 * Erro de regra de negócio. `message` é sempre o código: é o que cruza o IPC.
 * `mensagem` é o texto amigável usado pelo renderer.
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
