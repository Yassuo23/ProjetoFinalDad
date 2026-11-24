import type { ZodType } from 'zod'
import type { Canal } from '../../shared/contratos/canais'
import type { VerificadorOrigem } from '../seguranca/OrigemIpc'

/** Porta mínima do ipcMain — permite testar sem subir o Electron. */
export interface RegistradorIpc {
  handle(canal: string, ouvinte: (evento: unknown, ...argumentos: unknown[]) => unknown): void
}

/**
 * Registro único de handlers. A origem é obrigatória fora dos testes: sem ela, qualquer
 * renderer conseguiria chamar os canais. Os dublês de teste usam eventos `undefined`.
 */
export class RegistroIpc {
  private readonly canais = new Set<string>()

  constructor(
    private readonly ipc: RegistradorIpc,
    private readonly origem?: VerificadorOrigem,
  ) {
    if (!origem && process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
      throw new Error('RegistroIpc exige verificador de origem')
    }
  }

  registrar<Entrada, Saida>(
    canal: Canal,
    esquema: ZodType<Entrada>,
    tratar: (entrada: Entrada) => Promise<Saida>,
  ): void {
    if (this.canais.has(canal)) {
      throw new Error(`Canal duplicado: ${canal}`)
    }
    this.canais.add(canal)

    this.ipc.handle(canal, async (evento, bruto: unknown) => {
      if (this.origem && !this.origem.permitida(evento)) {
        throw new Error(`IPC_ORIGEM_INVALIDA:${canal}`)
      }

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
