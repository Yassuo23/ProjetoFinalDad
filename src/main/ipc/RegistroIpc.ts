import type { ZodType } from 'zod'
import type { Canal } from '../../shared/contratos/canais'

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
        // Nunca devolver o detalhe do Zod ao renderer.
        throw new Error(`IPC_INVALIDO:${canal}`)
      }
      return tratar(resultado.data)
    })
  }

  get total(): number {
    return this.canais.size
  }
}
