import { ESTADOS_EQUIPAMENTO, type EstadoEquipamento } from '../../../shared/contratos/estados'
import type {
  Categoria,
  Equipamento,
  EquipamentoListarFiltros,
} from '../../../shared/contratos/modelos'
import { criarElemento } from '../nucleo'
import {
  CLASSES,
  criarBotao,
  criarEntrada,
  criarOpcao,
  criarSelecao,
  rotular,
} from './ControlesFuncionais'
import { PaginaFuncional } from './PaginaFuncional'

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
  const campoNome = criarEntrada({ nome: 'nome', obrigatorio: true, maxlength: '120' })
  const selecaoCategoria = criarSelecao({ nome: 'categoriaId', obrigatorio: true })
  const campoPreco = criarEntrada({
    nome: 'precoDiaria',
    tipo: 'number',
    min: '0',
    step: '0.01',
    obrigatorio: true,
  })
  const campoAquisicao = criarEntrada({
    nome: 'valorAquisicao',
    tipo: 'number',
    min: '0',
    step: '0.01',
    obrigatorio: true,
  })
  const campoDescricao = criarEntrada({ nome: 'descricao', maxlength: '500' })

  const form = criarElemento('form', {
    className: CLASSES.formulario,
    atributos: { 'aria-label': 'Cadastro de equipamento' },
    filhos: [
      rotular('Nome', campoNome),
      rotular('Categoria', selecaoCategoria),
      rotular('Diária (R$)', campoPreco),
      rotular('Valor de aquisição (R$)', campoAquisicao),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [rotular('Descrição', campoDescricao)],
      }),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [criarBotao('Cadastrar equipamento', { tipo: 'submit' })],
      }),
    ],
  })

  const filtroCategoria = criarSelecao({
    nome: 'filtro-categoria',
    id: 'filtro-categoria',
  })
  filtroCategoria.append(criarOpcao('', 'Todas'))
  const filtroEstado = criarSelecao({ nome: 'filtro-estado', id: 'filtro-estado' })
  filtroEstado.append(criarOpcao('', 'Todos'))

  const selecaoEquipamento = criarSelecao({ nome: 'equipamentoId', obrigatorio: true })
  const campoInicio = criarEntrada({ nome: 'inicio', tipo: 'datetime-local', obrigatorio: true })
  const campoFim = criarEntrada({ nome: 'fim', tipo: 'datetime-local', obrigatorio: true })

  const formDisponibilidade = criarElemento('form', {
    className: CLASSES.formulario,
    atributos: { 'aria-label': 'Verificação de disponibilidade' },
    filhos: [
      rotular('Equipamento', selecaoEquipamento),
      rotular('Início', campoInicio),
      rotular('Fim', campoFim),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [criarBotao('Verificar', { tipo: 'submit' })],
      }),
    ],
  })

  const resultado = criarElemento('p', {
    className: CLASSES.disponivel,
    atributos: { id: 'disponibilidade-resultado', role: 'status', hidden: '' },
  })
  const areaErro = criarElemento('p', {
    className: CLASSES.erro,
    atributos: { id: 'equipamentos-erro', role: 'alert', hidden: '' },
  })
  const lista = criarElemento('div', {
    className: CLASSES.lista,
    atributos: { id: 'equipamentos-lista' },
    filhos: [criarElemento('p', { className: CLASSES.muted, texto: 'Carregando…' })],
  })

  container.replaceChildren(
    criarElemento('div', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Cadastro' }),
        form,
      ],
    }),
    criarElemento('div', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Filtros' }),
        criarElemento('div', {
          className: CLASSES.formulario,
          filhos: [rotular('Filtrar por categoria', filtroCategoria), rotular('Filtrar por estado', filtroEstado)],
        }),
      ],
    }),
    criarElemento('div', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', {
          className: CLASSES.tituloSecao,
          texto: 'Verificar disponibilidade',
        }),
        formDisponibilidade,
        resultado,
      ],
    }),
    areaErro,
    lista,
  )

  for (const estado of ESTADOS_EQUIPAMENTO) {
    filtroEstado.append(criarOpcao(estado, ROTULOS_ESTADO[estado]))
  }

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const mostrarResultado = (texto: string, disponivel: boolean): void => {
    resultado.textContent = texto
    resultado.className = disponivel ? CLASSES.disponivel : CLASSES.indisponivel
    resultado.hidden = false
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
        lista.replaceChildren(criarTexto('Nenhum equipamento encontrado.', CLASSES.muted))
      }

      const selecionado = selecaoEquipamento.value
      selecaoEquipamento.replaceChildren(
        ...equipamentos.map((equipamento) =>
          criarOpcao(String(equipamento.id), equipamento.nome),
        ),
      )
      if (equipamentos.some((equipamento) => String(equipamento.id) === selecionado)) {
        selecaoEquipamento.value = selecionado
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
          select.append(criarOpcao(String(categoria.id), categoria.nome))
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

  formDisponibilidade.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const dados = new FormData(formDisponibilidade)
    const equipamentoId = Number(dados.get('equipamentoId'))
    const inicio = String(dados.get('inicio') ?? '')
    const fim = String(dados.get('fim') ?? '')

    if (!Number.isInteger(equipamentoId) || equipamentoId <= 0 || inicio === '' || fim === '') {
      areaErro.textContent = 'Informe um equipamento e datas válidas.'
      areaErro.hidden = false
      return
    }

    const inicioData = new Date(inicio)
    const fimData = new Date(fim)
    if (Number.isNaN(inicioData.getTime()) || Number.isNaN(fimData.getTime())) {
      areaErro.textContent = 'Informe um equipamento e datas válidas.'
      areaErro.hidden = false
      return
    }

    areaErro.hidden = true
    resultado.hidden = true

    window.electronAPI.equipamentos
      .verificarDisponibilidade({
        equipamentoId,
        inicio: inicioData.toISOString(),
        fim: fimData.toISOString(),
      })
      .then((resposta) => {
        if (resposta.disponivel) {
          mostrarResultado('Disponível', true)
          return
        }
        const mensagem = resposta.motivo ? MENSAGENS_ERRO[resposta.motivo] : undefined
        mostrarResultado(mensagem ?? 'Indisponível.', false)
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
  const filhos: Array<Node | string> = [
    criarElemento('strong', { className: CLASSES.itemTitulo, texto: equipamento.nome }),
  ]

  const categoria = categorias.find((candidata) => candidata.id === equipamento.categoriaId)
  filhos.push(
    criarTexto(
      `${categoria?.nome ?? 'Categoria não encontrada'} · ${ROTULOS_ESTADO[equipamento.estado]} · ${DINHEIRO.format(equipamento.precoDiaria)}/dia`,
      CLASSES.muted,
    ),
  )

  if (equipamento.descricao) {
    filhos.push(criarTexto(equipamento.descricao, CLASSES.texto))
  }

  const botao = criarBotao('Inativar', {
    variante: 'perigo',
    acao: 'inativar',
    pequeno: true,
  })
  botao.dataset.id = String(equipamento.id)
  filhos.push(criarElemento('div', { className: CLASSES.acoesItem, filhos: [botao] }))

  return criarElemento('article', { className: CLASSES.item, filhos })
}

function criarTexto(texto: string, classe: string): HTMLElement {
  const elemento = criarElemento('p', { texto })
  elemento.className = classe
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

/** Tela funcional de equipamentos adaptada ao roteador do shell. */
export class PaginaEquipamentos extends PaginaFuncional {
  constructor() {
    super('Equipamentos', 'Cadastro, filtros e verificação de disponibilidade.', montarEquipamentos)
  }
}
