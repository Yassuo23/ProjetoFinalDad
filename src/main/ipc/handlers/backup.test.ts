import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  BackupRestaurarEntrada,
  ResultadoOperacaoArquivo,
} from '../../../shared/contratos/modelos'
import type { ServicoBackup } from '../../servicos/BackupServico'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarBackup } from './backup'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: Canal, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal não registrado: ${canal}`)
    return ouvinte(undefined, payload)
  }
}

function servicoFalso() {
  const criar = vi.fn(async (): Promise<ResultadoOperacaoArquivo> => ({
    caminho: '/downloads/zenite-20261123-1405.db',
    bytes: 4096,
  }))
  const restaurar = vi.fn(
    async (_entrada: BackupRestaurarEntrada): Promise<ResultadoOperacaoArquivo> => ({
      caminho: '/documentos/backup.db',
      bytes: 2048,
    }),
  )
  const servico: ServicoBackup = { criar, restaurar }
  return { servico, criar, restaurar }
}

describe('handlers de backup', () => {
  it('registra os dois canais e delega sem payload em criar', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    registrarBackup(new RegistroIpc(ipc), falso.servico)
    const entrada: BackupRestaurarEntrada = { caminho: '/documentos/backup.db' }

    expect(await ipc.invocar(CANAIS.backupCriar)).toEqual({
      caminho: '/downloads/zenite-20261123-1405.db',
      bytes: 4096,
    })
    expect(await ipc.invocar(CANAIS.backupRestaurar, entrada)).toEqual({
      caminho: '/documentos/backup.db',
      bytes: 2048,
    })
    expect(falso.criar).toHaveBeenCalledWith()
    expect(falso.restaurar).toHaveBeenCalledWith(entrada)
  })

  it('rejeita payloads fora do contrato com IPC_INVALIDO do canal', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    registrarBackup(new RegistroIpc(ipc), falso.servico)

    const casos: readonly [Canal, unknown][] = [
      [CANAIS.backupCriar, { caminho: '/documentos/backup.db' }],
      [CANAIS.backupRestaurar, {}],
      [CANAIS.backupRestaurar, { caminho: 42 }],
      [CANAIS.backupRestaurar, { caminho: 'arquivo.db\0extra' }],
    ]
    for (const [canal, payload] of casos) {
      await expect(ipc.invocar(canal, payload)).rejects.toThrow(`IPC_INVALIDO:${canal}`)
    }
    expect(falso.criar).not.toHaveBeenCalled()
    expect(falso.restaurar).not.toHaveBeenCalled()
  })

  it('propaga erros de domínio do serviço sem disfarçá-los', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    falso.restaurar.mockRejectedValueOnce(
      new ErroDeDominio(
        'CAMINHO_NAO_PERMITIDO',
        'Escolha um arquivo .db em um diretório permitido.',
      ),
    )
    registrarBackup(new RegistroIpc(ipc), falso.servico)

    await expect(
      ipc.invocar(CANAIS.backupRestaurar, { caminho: '/outro/backup.db' }),
    ).rejects.toThrow('CAMINHO_NAO_PERMITIDO')
  })

  it('devolve cancelamento do serviço como resposta normal', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    falso.criar.mockResolvedValueOnce({ caminho: null, bytes: 0 })
    registrarBackup(new RegistroIpc(ipc), falso.servico)

    expect(await ipc.invocar(CANAIS.backupCriar)).toEqual({ caminho: null, bytes: 0 })
  })
})
