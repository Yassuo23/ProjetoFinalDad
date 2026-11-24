import type { ZodType } from 'zod'
import type { Canal } from '../../shared/contratos/canais'
import { ErroSemPermissao, ErroValidacao } from '../nucleo/erros'
import { paraErroApi } from './erros'

/** Porta mínima do ipcMain — permite testar sem subir o Electron. */
export interface RegistradorIpc {
  handle(canal: string, ouvinte: (evento: unknown, ...argumentos: unknown[]) => unknown): void
}

export interface ValidadorOrigem {
  confiavel(evento: unknown): boolean
}

export class RegistroIpc {
  private readonly canais = new Set<string>()

  constructor(
    private readonly ipc: RegistradorIpc,
    private readonly origem: ValidadorOrigem,
  ) {}

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
      if (!this.origem.confiavel(evento)) {
        throw paraErroApi(new ErroSemPermissao('Chamada IPC de origem nao permitida.'), canal)
      }

      const resultado = esquema.safeParse(bruto)
      if (!resultado.success) {
        throw paraErroApi(new ErroValidacao('Dados invalidos.', resultado.error.message), canal)
      }

      try {
        return await tratar(resultado.data)
      } catch (erro) {
        throw paraErroApi(erro, canal)
      }
    })
  }

  get total(): number {
    return this.canais.size
  }
}
