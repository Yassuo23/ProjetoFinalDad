import type { PrevisaoTempo, Reserva, StatusReserva } from '../../../shared/contratos/modelos'

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
  container.innerHTML = `
    <form class="form-reserva">
      <label>Cliente <select name="clienteId" required></select></label>
      <label>Equipamento <select name="equipamentoId" required></select></label>
      <label>Início <input name="inicio" type="datetime-local" required /></label>
      <label>Fim <input name="fim" type="datetime-local" required /></label>
      <label>Local da atividade <input name="localAtividade" required maxlength="120" /></label>
      <button class="button" type="submit">Criar reserva</button>
    </form>

    <p id="reservas-erro" class="erro" role="alert" hidden></p>
    <div id="reservas-lista" class="lista-reservas"><p class="muted">Carregando…</p></div>

    <h3 class="titulo-secao">Previsão do tempo</h3>
    <form class="form-previsao">
      <label>Local <input name="local" required maxlength="120" /></label>
      <label>Início <input name="inicio" type="date" required /></label>
      <label>Fim <input name="fim" type="date" required /></label>
      <button class="button" type="submit">Consultar previsão</button>
    </form>
    <div id="previsao-resultado" class="previsao-resultado" role="status" hidden></div>
  `

  const form = obrigar<HTMLFormElement>(container, '.form-reserva')
  const formPrevisao = obrigar<HTMLFormElement>(container, '.form-previsao')
  const selecaoCliente = obrigar<HTMLSelectElement>(form, 'select[name="clienteId"]')
  const selecaoEquipamento = obrigar<HTMLSelectElement>(form, 'select[name="equipamentoId"]')
  const areaErro = obrigar<HTMLElement>(container, '#reservas-erro')
  const lista = obrigar<HTMLElement>(container, '#reservas-lista')
  const resultadoPrevisao = obrigar<HTMLElement>(container, '#previsao-resultado')

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const recarregar = async (): Promise<void> => {
    areaErro.hidden = true
    try {
      const reservas = await window.electronAPI.reservas.listar()
      if (reservas.length === 0) {
        lista.replaceChildren(criarTexto('Nenhuma reserva encontrada.', 'muted'))
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
  const item = document.createElement('article')
  item.className = 'item-reserva'

  const titulo = document.createElement('strong')
  titulo.textContent = `Reserva #${reserva.id}`
  item.append(titulo)

  const status = criarTexto(ROTULOS_STATUS[reserva.status], `status-${reserva.status}`)
  item.append(status)

  const periodo = new Date(reserva.inicio)
  const fim = new Date(reserva.fim)
  item.append(
    criarTexto(`${periodo.toLocaleString('pt-BR')} → ${fim.toLocaleString('pt-BR')}`, 'muted'),
  )
  item.append(
    criarTexto(`Cliente #${reserva.clienteId} · Equipamento #${reserva.equipamentoId}`, 'muted'),
  )
  item.append(criarTexto(`Local: ${reserva.localAtividade ?? 'Não informado'}`))

  if (reserva.status === 'pendente' || reserva.status === 'confirmada') {
    const acoes = document.createElement('div')
    acoes.className = 'acoes-reserva'
    if (reserva.status === 'pendente') {
      acoes.append(criarBotao('Confirmar', 'confirmar', reserva.id))
    }
    acoes.append(criarBotao('Cancelar', 'cancelar', reserva.id))
    item.append(acoes)
  }

  return item
}

function criarBotao(texto: string, acao: string, id: number): HTMLButtonElement {
  const botao = document.createElement('button')
  botao.className = `button button-pequeno${acao === 'cancelar' ? ' button-perigo' : ''}`
  botao.type = 'button'
  botao.textContent = texto
  botao.dataset.acao = acao
  botao.dataset.id = String(id)
  return botao
}

function criarPrevisao(previsao: PrevisaoTempo): HTMLElement[] {
  const titulo = criarTexto(
    `${previsao.local} · ${previsao.latitude.toFixed(2)}, ${previsao.longitude.toFixed(2)}`,
    'previsao-titulo',
  )
  const dias = document.createElement('ul')
  dias.className = 'previsao-dias'
  for (const dia of previsao.dias) {
    const item = document.createElement('li')
    item.className = 'previsao-dia'
    item.textContent =
      `${dia.data} · ${dia.descricao} · ${dia.temperaturaMin}°C a ${dia.temperaturaMax}°C` +
      ` · ${dia.precipitacaoMm} mm`
    dias.append(item)
  }
  if (previsao.dias.length === 0) {
    dias.append(criarTexto('Nenhum dia disponível para o período.', 'muted'))
  }
  return [titulo, dias]
}

function criarTexto(texto: string, classe?: string): HTMLElement {
  const elemento = document.createElement('p')
  elemento.textContent = texto
  if (classe) elemento.className = classe
  return elemento
}

function paraIso(valor: string): string | null {
  if (valor === '') return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function obrigar<T extends Element>(container: ParentNode, seletor: string): T {
  const elemento = container.querySelector<T>(seletor)
  if (!elemento) throw new Error(`Falha ao montar a tela de reservas: ${seletor}`)
  return elemento
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
