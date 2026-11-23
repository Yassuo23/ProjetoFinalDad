import { ESTADOS_EQUIPAMENTO, type EstadoEquipamento } from '../../../shared/contratos/estados'
import type {
  Categoria,
  Equipamento,
  EquipamentoListarFiltros,
} from '../../../shared/contratos/modelos'

const ROTULOS_ESTADO: Record<EstadoEquipamento, string> = {
  disponivel: 'Disponível',
  em_manutencao: 'Em manutenção',
  baixado: 'Baixado',
  reservado: 'Reservado',
}

const MENSAGENS_ERRO: Record<string, string> = {
  EQUIPAMENTO_NAO_ENCONTRADO: 'Equipamento não encontrado.',
  CATEGORIA_NAO_ENCONTRADA: 'Categoria não encontrada.',
  NOME_DUPLICADO: 'Já existe equipamento com esse nome.',
  PERIODO_INVALIDO: 'Período inválido.',
  ITEM_INDISPONIVEL: 'Item indisponível.',
}

const DINHEIRO = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Tela de equipamentos: só chama a API tipada; nunca Node, IPC cru ou SQL. */
export function montarEquipamentos(container: HTMLElement): void {
  container.innerHTML = `
    <form class="form-equipamento">
      <label>Nome <input name="nome" required maxlength="120" /></label>
      <label>Categoria <select name="categoriaId" required></select></label>
      <label>Diária (R$) <input name="precoDiaria" type="number" min="0" step="0.01" required /></label>
      <label>Valor de aquisição (R$)
        <input name="valorAquisicao" type="number" min="0" step="0.01" required />
      </label>
      <label>Descrição <input name="descricao" maxlength="500" /></label>
      <button class="button" type="submit">Cadastrar equipamento</button>
    </form>

    <div class="filtros">
      <label>Filtrar por categoria <select id="filtro-categoria"><option value="">Todas</option></select></label>
      <label>Filtrar por estado <select id="filtro-estado"><option value="">Todos</option></select></label>
    </div>

    <p id="equipamentos-erro" class="erro" role="alert" hidden></p>
    <div id="equipamentos-lista" class="lista-equipamentos"><p class="muted">Carregando…</p></div>
  `

  const form = container.querySelector<HTMLFormElement>('.form-equipamento')
  const selecaoCategoria = container.querySelector<HTMLSelectElement>('select[name="categoriaId"]')
  const filtroCategoria = container.querySelector<HTMLSelectElement>('#filtro-categoria')
  const filtroEstado = container.querySelector<HTMLSelectElement>('#filtro-estado')
  const areaErro = container.querySelector<HTMLElement>('#equipamentos-erro')
  const lista = container.querySelector<HTMLElement>('#equipamentos-lista')

  if (!form || !selecaoCategoria || !filtroCategoria || !filtroEstado || !areaErro || !lista) {
    throw new Error('Falha ao montar a tela de equipamentos')
  }

  for (const estado of ESTADOS_EQUIPAMENTO) {
    const opcao = document.createElement('option')
    opcao.value = estado
    opcao.textContent = ROTULOS_ESTADO[estado]
    filtroEstado.append(opcao)
  }

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const recarregar = async (): Promise<void> => {
    areaErro.hidden = true
    const filtros: EquipamentoListarFiltros = {}
    const categoriaId = Number(filtroCategoria.value)
    if (categoriaId > 0) filtros.categoriaId = categoriaId

    const estado = filtroEstado.value
    if ((ESTADOS_EQUIPAMENTO as readonly string[]).includes(estado)) {
      filtros.estado = estado as EstadoEquipamento
    }

    try {
      const equipamentos = await window.electronAPI.equipamentos.listar(filtros)
      lista.replaceChildren(...equipamentos.map((equipamento) => criarItem(equipamento, categorias)))
      if (equipamentos.length === 0) {
        lista.replaceChildren(criarTexto('Nenhum equipamento encontrado.', 'muted'))
      }
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  let categorias: readonly Categoria[] = []

  window.electronAPI.categorias
    .listar()
    .then((itens) => {
      categorias = itens
      for (const categoria of itens) {
        for (const select of [selecaoCategoria, filtroCategoria]) {
          const opcao = document.createElement('option')
          opcao.value = String(categoria.id)
          opcao.textContent = categoria.nome
          select.append(opcao)
        }
      }
      return recarregar()
    })
    .catch(mostrarErro)

  filtroCategoria.addEventListener('change', () => void recarregar())
  filtroEstado.addEventListener('change', () => void recarregar())

  form.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const dados = new FormData(form)
    const descricao = String(dados.get('descricao') ?? '').trim()

    window.electronAPI.equipamentos
      .criar({
        nome: String(dados.get('nome') ?? '').trim(),
        categoriaId: Number(dados.get('categoriaId')),
        precoDiaria: Number(dados.get('precoDiaria')),
        valorAquisicao: Number(dados.get('valorAquisicao')),
        descricao: descricao === '' ? null : descricao,
      })
      .then(() => {
        form.reset()
        return recarregar()
      })
      .catch(mostrarErro)
  })

  lista.addEventListener('click', (evento) => {
    const alvo = evento.target
    if (!(alvo instanceof HTMLButtonElement) || alvo.dataset.acao !== 'inativar') return

    window.electronAPI.equipamentos
      .inativar(Number(alvo.dataset.id))
      .then(() => recarregar())
      .catch(mostrarErro)
  })
}

function criarItem(
  equipamento: Equipamento,
  categorias: readonly Categoria[],
): HTMLElement {
  const item = document.createElement('article')
  item.className = 'item-equipamento'

  const titulo = document.createElement('strong')
  titulo.textContent = equipamento.nome
  item.append(titulo)

  const categoria = categorias.find((candidata) => candidata.id === equipamento.categoriaId)
  const detalhes = criarTexto(
    `${categoria?.nome ?? 'Categoria não encontrada'} · ${ROTULOS_ESTADO[equipamento.estado]} · ${DINHEIRO.format(equipamento.precoDiaria)}/dia`,
    'muted',
  )
  item.append(detalhes)

  if (equipamento.descricao) {
    item.append(criarTexto(equipamento.descricao))
  }

  const botao = document.createElement('button')
  botao.className = 'button button-perigo'
  botao.type = 'button'
  botao.textContent = 'Inativar'
  botao.dataset.acao = 'inativar'
  botao.dataset.id = String(equipamento.id)
  item.append(botao)

  return item
}

function criarTexto(texto: string, classe?: string): HTMLElement {
  const elemento = document.createElement('p')
  elemento.textContent = texto
  if (classe) elemento.className = classe
  return elemento
}

function mensagemAmigavel(erro: unknown): string {
  if (erro instanceof Error) {
    const mensagem = MENSAGENS_ERRO[erro.message]
    if (mensagem) return mensagem
    if (erro.message.startsWith('IPC_INVALIDO:')) return 'Dados inválidos. Confira os campos.'
  }
  return 'Não foi possível concluir a operação.'
}
