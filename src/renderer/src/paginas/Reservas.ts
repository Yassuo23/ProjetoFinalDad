import type { PrevisaoTempo, Reserva, StatusReserva } from '../../../shared/contratos/modelos'
import { criarElemento } from '../nucleo'
import {
  CLASSES,
  classeStatusReserva,
  criarBotao,
  criarEntrada,
  criarSelecao,
  rotular,
} from './ControlesFuncionais'
import { PaginaFuncional } from './PaginaFuncional'

const ROTULOS_STATUS: Record<StatusReserva, string> = {
  pendente: 'Pendente',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
}

const MENSAGENS_ERRO: Record<string, string> = {
  RESERVA_NAO_ENCONTRADA: 'Reserva não encontrada.',
  RESERVA_JA_CONFIRMADA: 'Reserva já confirmada.',
  RESERVA_JA_CANCELADA: 'Reserva já cancelada.',
  LOCAL_NAO_ENCONTRADO: 'Local não encontrado.',
  PREVISAO_INDISPONIVEL: 'Previsão do tempo indisponível no momento.',
  ITEM_INDISPONIVEL: 'Equipamento indisponível para o período informado.',
  PERIODO_INVALIDO: 'Período inválido: o início deve ser anterior ao fim.',
  CLIENTE_NAO_ENCONTRADO: 'Cliente não encontrado ou inativo.',
  EQUIPAMENTO_NAO_ENCONTRADO: 'Equipamento não encontrado ou inativo.',
}

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/

/** Tela de reservas: só chama a API tipada; nunca Node, IPC cru, fetch ou SQL. */
export function montarReservas(container: HTMLElement): void {
  const selecaoCliente = criarSelecao({ nome: 'clienteId', obrigatorio: true })
  const selecaoEquipamento = criarSelecao({ nome: 'equipamentoId', obrigatorio: true })
  const campoInicio = criarEntrada({ nome: 'inicio', tipo: 'datetime-local', obrigatorio: true })
  const campoFim = criarEntrada({ nome: 'fim', tipo: 'datetime-local', obrigatorio: true })
  const campoLocal = criarEntrada({ nome: 'localAtividade', obrigatorio: true, maxlength: '120' })

  const form = criarElemento('form', {
    className: CLASSES.formulario,
    atributos: { 'aria-label': 'Criação de reserva' },
    filhos: [
      rotular('Cliente', selecaoCliente),
      rotular('Equipamento', selecaoEquipamento),
      rotular('Início', campoInicio),
      rotular('Fim', campoFim),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [rotular('Local da atividade', campoLocal)],
      }),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [criarBotao('Criar reserva', { tipo: 'submit' })],
      }),
    ],
  })

  const areaErro = criarElemento('p', {
    className: CLASSES.erro,
    atributos: { id: 'reservas-erro', role: 'alert', hidden: '' },
  })
  const lista = criarElemento('div', {
    className: CLASSES.lista,
    atributos: { id: 'reservas-lista' },
    filhos: [criarElemento('p', { className: CLASSES.muted, texto: 'Carregando…' })],
  })

  const campoLocalPrevisao = criarEntrada({
    nome: 'local',
    obrigatorio: true,
    maxlength: '120',
  })
  const campoInicioPrevisao = criarEntrada({ nome: 'inicio', tipo: 'date', obrigatorio: true })
  const campoFimPrevisao = criarEntrada({ nome: 'fim', tipo: 'date', obrigatorio: true })

  const formPrevisao = criarElemento('form', {
    className: CLASSES.formulario,
    atributos: { 'aria-label': 'Consulta de previsão do tempo' },
    filhos: [
      rotular('Local', campoLocalPrevisao),
      rotular('Início', campoInicioPrevisao),
      rotular('Fim', campoFimPrevisao),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [criarBotao('Consultar previsão', { tipo: 'submit' })],
      }),
    ],
  })
  const resultadoPrevisao = criarElemento('div', {
    className: CLASSES.resumo,
    atributos: { id: 'previsao-resultado', role: 'status', hidden: '' },
  })

  container.replaceChildren(
    criarElemento('div', { className: CLASSES.cartao, filhos: [form] }),
    areaErro,
    lista,
    criarElemento('div', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Previsão do tempo' }),
        formPrevisao,
        resultadoPrevisao,
      ],
    }),
  )

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const recarregar = async (): Promise<void> => {
    areaErro.hidden = true
    try {
      const reservas = await window.electronAPI.reservas.listar()
      if (reservas.length === 0) {
        lista.replaceChildren(criarTexto('Nenhuma reserva encontrada.', CLASSES.muted))
        return
      }
      lista.replaceChildren(...reservas.map(criarItem))
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  const preencherOpcoes = <T extends { id: number; nome: string }>(
    select: HTMLSelectElement,
    itens: readonly T[],
  ): void => {
    select.replaceChildren(
      ...itens.map((item) => {
        const opcao = document.createElement('option')
        opcao.value = String(item.id)
        opcao.textContent = item.nome
        return opcao
      }),
    )
  }

  Promise.all([window.electronAPI.clientes.listar(), window.electronAPI.equipamentos.listar()])
    .then(([clientes, equipamentos]) => {
      preencherOpcoes(selecaoCliente, clientes)
      preencherOpcoes(selecaoEquipamento, equipamentos)
      return recarregar()
    })
    .catch(mostrarErro)

  form.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const dados = new FormData(form)
    const clienteId = Number(dados.get('clienteId'))
    const equipamentoId = Number(dados.get('equipamentoId'))
    const localAtividade = String(dados.get('localAtividade') ?? '').trim()
    const inicio = paraIso(String(dados.get('inicio') ?? ''))
    const fim = paraIso(String(dados.get('fim') ?? ''))

    if (clienteId <= 0 || equipamentoId <= 0 || localAtividade === '' || !inicio || !fim) {
      mostrarErro(new Error('Dados inválidos.'))
      return
    }

    areaErro.hidden = true
    window.electronAPI.reservas
      .criar({ clienteId, equipamentoId, inicio, fim, localAtividade })
      .then(() => {
        form.reset()
        return recarregar()
      })
      .catch(mostrarErro)
  })

  lista.addEventListener('click', (evento) => {
    const alvo = evento.target
    if (
      !(alvo instanceof HTMLButtonElement) ||
      (alvo.dataset.acao !== 'confirmar' && alvo.dataset.acao !== 'cancelar')
    ) {
      return
    }

    const id = Number(alvo.dataset.id)
    if (!Number.isInteger(id) || id <= 0) return
    areaErro.hidden = true

    const operacao =
      alvo.dataset.acao === 'confirmar'
        ? window.electronAPI.reservas.confirmar(id)
        : window.electronAPI.reservas.cancelar(id)
    operacao.then(() => recarregar()).catch(mostrarErro)
  })

  formPrevisao.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const dados = new FormData(formPrevisao)
    const local = String(dados.get('local') ?? '').trim()
    const inicio = String(dados.get('inicio') ?? '')
    const fim = String(dados.get('fim') ?? '')

    if (local === '' || !DATA_ISO.test(inicio) || !DATA_ISO.test(fim) || inicio > fim) {
      mostrarErro(new Error('PERIODO_INVALIDO'))
      return
    }

    areaErro.hidden = true
    resultadoPrevisao.hidden = true
    window.electronAPI.reservas
      .previsaoTempo({
        local,
        inicio: `${inicio}T00:00:00.000Z`,
        fim: `${fim}T23:59:59.999Z`,
      })
      .then((previsao) => {
        resultadoPrevisao.replaceChildren(...criarPrevisao(previsao))
        resultadoPrevisao.hidden = false
      })
      .catch(mostrarErro)
  })
}

function criarItem(reserva: Reserva): HTMLElement {
  const filhos: Array<Node | string> = [
    criarElemento('strong', {
      className: CLASSES.itemTitulo,
      texto: `Reserva #${reserva.id}`,
    }),
    criarTexto(ROTULOS_STATUS[reserva.status], classeStatusReserva(reserva.status)),
  ]

  const periodo = new Date(reserva.inicio)
  const fim = new Date(reserva.fim)
  filhos.push(
    criarTexto(`${periodo.toLocaleString('pt-BR')} → ${fim.toLocaleString('pt-BR')}`, CLASSES.muted),
  )
  filhos.push(
    criarTexto(`Cliente #${reserva.clienteId} · Equipamento #${reserva.equipamentoId}`, CLASSES.muted),
  )
  filhos.push(criarTexto(`Local: ${reserva.localAtividade ?? 'Não informado'}`, CLASSES.texto))

  if (reserva.status === 'pendente' || reserva.status === 'confirmada') {
    const botoes: HTMLButtonElement[] = []
    if (reserva.status === 'pendente') {
      const confirmar = criarBotao('Confirmar', { acao: 'confirmar', pequeno: true })
      confirmar.dataset.id = String(reserva.id)
      botoes.push(confirmar)
    }
    const cancelar = criarBotao('Cancelar', {
      acao: 'cancelar',
      variante: 'perigo',
      pequeno: true,
    })
    cancelar.dataset.id = String(reserva.id)
    botoes.push(cancelar)
    filhos.push(criarElemento('div', { className: CLASSES.acoesItem, filhos: botoes }))
  }

  return criarElemento('article', { className: CLASSES.item, filhos })
}

function criarPrevisao(previsao: PrevisaoTempo): HTMLElement[] {
  const titulo = criarElemento('p', {
    className: CLASSES.resumoTitulo,
    texto: `${previsao.local} · ${previsao.latitude.toFixed(2)}, ${previsao.longitude.toFixed(2)}`,
  })
  const dias = criarElemento('ul', { className: CLASSES.previsaoLista })
  for (const dia of previsao.dias) {
    const item = criarElemento('li', {
      className: CLASSES.previsaoItem,
      texto:
        `${dia.data} · ${dia.descricao} · ${dia.temperaturaMin}°C a ${dia.temperaturaMax}°C` +
        ` · ${dia.precipitacaoMm} mm`,
    })
    dias.append(item)
  }
  if (previsao.dias.length === 0) {
    dias.append(criarElemento('li', {
      className: CLASSES.muted,
      texto: 'Nenhum dia disponível para o período.',
    }))
  }
  return [titulo, dias]
}

function criarTexto(texto: string, classe: string): HTMLElement {
  const elemento = criarElemento('p', { texto })
  elemento.className = classe
  return elemento
}

function paraIso(valor: string): string | null {
  if (valor === '') return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function mensagemAmigavel(erro: unknown): string {
  if (erro instanceof Error) {
    const mensagem = MENSAGENS_ERRO[erro.message]
    if (mensagem) return mensagem
    if (erro.message === 'Dados inválidos.') return erro.message
    if (erro.message.startsWith('IPC_INVALIDO:')) return 'Dados inválidos. Confira os campos.'
  }
  return 'Não foi possível concluir a operação.'
}

/** Tela funcional de reservas adaptada ao roteador do shell. */
export class PaginaReservas extends PaginaFuncional {
  constructor() {
    super('Reservas', 'Criação, confirmação e previsão do tempo.', montarReservas)
  }
}
