import type { Equipamento } from '../../../shared/contratos/modelos'

export class ServicoEquipamentos {
  listar(): Promise<Equipamento[]> {
    return window.electronAPI.equipamentos.listar()
  }
}
