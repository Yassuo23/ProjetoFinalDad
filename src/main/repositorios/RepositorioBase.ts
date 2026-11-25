import type { ClienteBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'

/**
 * Base dos repositórios: toda operação usa uma conexão do pool e sempre a
 * devolve, inclusive quando a consulta ou a transação falha.
 */
export abstract class RepositorioBase {
  constructor(private readonly conexao: ConexaoBanco) {}

  protected async comCliente<T>(fn: (cliente: ClienteBanco) => Promise<T>): Promise<T> {
    const { cliente, liberar } = await this.conexao.obterCliente()
    try {
      return await fn(cliente)
    } finally {
      liberar()
    }
  }

  protected async transacao<T>(fn: (cliente: ClienteBanco) => Promise<T>): Promise<T> {
    return this.comCliente(async (cliente) => {
      await cliente.beginTransaction()
      try {
        const resultado = await fn(cliente)
        await cliente.commit()
        return resultado
      } catch (erro) {
        try {
          await cliente.rollback()
        } catch (erroRollback) {
          throw new AggregateError([erro, erroRollback], 'Falha ao reverter a transação', {
            cause: erroRollback,
          })
        }
        throw erro
      }
    })
  }
}
