import type { Categoria } from '../../../shared/contratos/modelos'

const ERRO_CARREGAMENTO = 'Não foi possível carregar as categorias.'

/** Página simples de categorias: chama apenas a API tipada exposta pelo preload. */
export function montarCategorias(container: HTMLElement): void {
  container.textContent = 'Carregando…'

  window.electronAPI.categorias
    .listar()
    .then((categorias) => {
      if (categorias.length === 0) {
        container.textContent = 'Nenhuma categoria cadastrada.'
        return
      }
      container.replaceChildren(...categorias.map(criarItem))
    })
    .catch(() => {
      // Erro de IPC/driver nunca é exibido ao usuário.
      container.textContent = ERRO_CARREGAMENTO
    })
}

function criarItem(categoria: Categoria): HTMLElement {
  const item = document.createElement('div')
  item.className = 'categoria'

  const nome = document.createElement('strong')
  nome.textContent = categoria.nome
  item.append(nome)

  if (categoria.descricao) {
    const descricao = document.createElement('span')
    descricao.className = 'muted'
    descricao.textContent = categoria.descricao
    item.append(descricao)
  }

  return item
}
