import type { ZodType } from 'zod'
import type { Canal } from '../../shared/contratos/canais'

const ERRO_GENERICO = new Error('Não foi possível concluir a operação.')

/** Códigos e stacks ficam no main; o renderer recebe só a mensagem curta. */
function erroParaRenderer(erro: unknown): Error {
  if (!(erro instanceof Error)) return ERRO_GENERICO
  erro.stack = undefined
  return erro
}

/** Porta mínima do ipcMain — permite testar sem subir o Electron. */
export interface RegistradorIpc {
  handle(canal: string, ouvinte: (evento: unknown, ...argumentos: unknown[]) => unknown): void
}

export class RegistroIpc {
  private readonly canais = new Set<string>()

  constructor(private readonly ipc: RegistradorIpc) {}

  registrar<Entrada, Saida>(
    canal: Canal,
    esquema: ZodType<Entrada>,
    tratar: (entrada: Entrada) => Promise<Saida>,
  ): void {
    if (this.canais.has(canal)) {
      throw new Error(`Canal duplicado: ${canal}`)
    }
    this.canais.add(canal)

    this.ipc.handle(canal, async (_evento, bruto: unknown) => {
      const resultado = esquema.safeParse(bruto)
      if (!resultado.success) {
        // Nunca devolver o detalhe do Zod nem stack ao renderer.
        const falha = new Error(`IPC_INVALIDO:${canal}`)
        falha.stack = undefined
        throw falha
      }
      return tratar(resultado.data).catch((erro: unknown): never => {
        throw erroParaRenderer(erro)
      })
    })
  }

  get total(): number {
    return this.canais.size
  }
}
