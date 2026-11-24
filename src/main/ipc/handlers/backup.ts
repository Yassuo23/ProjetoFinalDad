import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaBackupCriar, esquemaBackupRestaurar } from '../../../shared/contratos/esquemas'
import type { ServicoBackup } from '../../servicos/BackupServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handlers finos: o caminho é validado no serviço, nunca aqui (ADR 0019). */
export function registrarBackup(registro: RegistroIpc, servico: ServicoBackup): void {
  registro.registrar(CANAIS.backupCriar, esquemaBackupCriar, async () => servico.criar())

  registro.registrar(CANAIS.backupRestaurar, esquemaBackupRestaurar, async (entrada) =>
    servico.restaurar(entrada),
  )
}
