import type { Categoria } from '../../../shared/contratos/modelos'
import { criarElemento } from '../nucleo'
import { CLASSES } from './ControlesFuncionais'
import { PaginaFuncional } from './PaginaFuncional'

const ERRO_CARREGAMENTO = 'Não foi possível carregar as categorias.'

/** Página simples de categorias: chama apenas a API tipada exposta pelo preload. */
export function montarCategorias(container: HTMLElement): void {
  container.replaceChildren(
    criarElemento('p', { className: CLASSES.muted, texto: 'Carregando…' }),
  )

  window.electronAPI.categorias
    .listar()
    .then((categorias) => {
      if (categorias.length === 0) {
        container.replaceChildren(
          criarElemento('p', {
            className: CLASSES.muted,
            texto: 'Nenhuma categoria cadastrada.',
          }),
        )
        return
      }
      container.replaceChildren(...categorias.map(criarItem))
    })
    .catch(() => {
      // Erro de IPC/driver nunca é exibido ao usuário.
      container.replaceChildren(criarElemento('p', { className: CLASSES.erro, texto: ERRO_CARREGAMENTO }))
    })
}

function criarItem(categoria: Categoria): HTMLElement {
  const filhos: Array<Node | string> = [
    criarElemento('strong', { className: CLASSES.itemTitulo, texto: categoria.nome }),
  ]
  if (categoria.descricao) {
    filhos.push(criarElemento('span', { className: CLASSES.muted, texto: categoria.descricao }))
  }
  return criarElemento('article', { className: CLASSES.item, filhos })
}

/** Tela funcional de categorias adaptada ao roteador do shell. */
export class PaginaCategorias extends PaginaFuncional {
  constructor() {
    super('Categorias', 'Grupos usados no cadastro de equipamentos.', montarCategorias)
  }
}
