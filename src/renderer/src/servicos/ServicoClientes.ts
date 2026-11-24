import type { Cliente } from '../../../shared/contratos/modelos'

export class ServicoClientes {
  listar(): Promise<Cliente[]> {
    return window.electronAPI.clientes.listar()
  }
}
