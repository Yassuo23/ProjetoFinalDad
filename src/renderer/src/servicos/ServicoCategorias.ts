import type { Categoria } from '../../../shared/contratos/modelos'

/** Acesso somente à ponte tipada — nenhum dado de exemplo nesta fachada. */
export class ServicoCategorias {
  listar(): Promise<Categoria[]> {
    return window.electronAPI.categorias.listar()
  }
}
