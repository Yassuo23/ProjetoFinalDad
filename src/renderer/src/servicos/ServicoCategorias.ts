import { vigiarSessao } from './VigilanciaSessao'
import type {
  Categoria,
  CategoriaAtualizarEntrada,
  CategoriaCriarEntrada,
  CategoriaListarFiltros,
} from '../../../shared/contratos/modelos'

/** Acesso somente à ponte tipada — nenhum dado de exemplo nesta fachada. */
export class ServicoCategorias {
  listar(filtros?: CategoriaListarFiltros): Promise<Categoria[]> {
    return vigiarSessao(window.electronAPI.categorias.listar(filtros))
  }

  buscarPorId(id: number) {
    return vigiarSessao(window.electronAPI.categorias.buscarPorId(id))
  }

  criar(dados: CategoriaCriarEntrada) {
    return vigiarSessao(window.electronAPI.categorias.criar(dados))
  }

  atualizar(dados: CategoriaAtualizarEntrada) {
    return vigiarSessao(window.electronAPI.categorias.atualizar(dados))
  }

  inativar(id: number): Promise<void> {
    return vigiarSessao(window.electronAPI.categorias.inativar(id))
  }
}
