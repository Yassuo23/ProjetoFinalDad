import type { FormaPagamento, Pagamento, StatusPagamento } from '../../../shared/contratos/modelos'

const FORMAS: readonly { valor: FormaPagamento; rotulo: string }[] = [
  { valor: 'dinheiro', rotulo: 'Dinheiro' },
  { valor: 'pix', rotulo: 'PIX' },
  { valor: 'cartao_credito', rotulo: 'Cartão de crédito' },
  { valor: 'cartao_debito', rotulo: 'Cartão de débito' },
]

const ROTULOS_STATUS: Record<StatusPagamento, string> = {
  pendente: 'Pendente',
  pago: 'Pago',
  estornado: 'Estornado',
}

const MENSAGENS_ERRO: Record<string, string> = {
  PAGAMENTO_NAO_ENCONTRADO: 'Pagamento não encontrado.',
  PAGAMENTO_JA_REGISTRADO: 'Já existe pagamento para esta reserva.',
  PAGAMENTO_JA_PAGO: 'Pagamento não está pendente.',
  PAGAMENTO_JA_ESTORNADO: 'Pagamento não está pago.',
  VALOR_PAGAMENTO_INVALIDO: 'Informe um valor maior que zero.',
  RESERVA_NAO_ENCONTRADA: 'Reserva não encontrada.',
  RESERVA_NAO_CONFIRMADA: 'Só é possível pagar reserva confirmada ou concluída.',
  IPC_INVALIDO: 'Dados inválidos. Confira os campos.',
  'Dados inválidos.': 'Informe reserva, valor e forma de pagamento.',
}

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Tela de pagamentos: só chama a API tipada; nunca Node, IPC cru, fetch ou SQL. */
export function montarPagamentos(container: HTMLElement): void {
  container.innerHTML = `
    <form class="form-pagamento">
      <label>Reserva <select name="reservaId" required></select></label>
      <label>Valor (R$) <input name="valor" type="number" min="0.01" step="0.01" required /></label>
      <label>Forma <select name="forma" required></select></label>
      <button class="button" type="submit">Registrar</button>
    </form>

    <p class="dica muted"> Quando há devolução, o valor da última multa é sugerido no campo valor. Confira antes de registrar.</p>
    <p id="pagamentos-erro" class="erro" role="alert" hidden></p>
    <div id="pagamentos-lista" class="lista-pagamentos"><p class="muted">Carregando…</p></div>
  `

  const form = obrigar<HTMLFormElement>(container, '.form-pagamento')
  const selecaoReserva = obrigar<HTMLSelectElement>(form, 'select[name="reservaId"]')
  const selecaoForma = obrigar<HTMLSelectElement>(form, 'select[name="forma"]')
  const campoValor = obrigar<HTMLInputElement>(form, 'input[name="valor"]')
  const areaErro = obrigar<HTMLElement>(container, '#pagamentos-erro')
  const lista = obrigar<HTMLElement>(container, '#pagamentos-lista')

  selecaoForma.replaceChildren(
    ...FORMAS.map(({ valor, rotulo }) => {
      const opcao = document.createElement('option')
      opcao.value = valor
      opcao.textContent = rotulo
      return opcao
    }),
  )

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const sugerirValor = (reservaId: number): void => {
    campoValor.placeholder = ''
    window.electronAPI.devolucoes
      .buscarPorReserva(reservaId)
      .then((devolucao) =>
        window.electronAPI.multas.calcular({
          reservaId,
          devolvidoEm: devolucao.devolvidoEm,
        }),
      )
      .then((calculo) => {
        if (Number(selecaoReserva.value) === reservaId) {
          campoValor.placeholder = REAIS.format(calculo.valorTotal)
        }
      })
      .catch((erro: unknown) => {
        if (!(erro instanceof Error)) return
        if (
          erro.message === 'RESERVA_NAO_ENCONTRADA' ||
          erro.message === 'MULTA_BASE_INDISPONIVEL'
        ) {
          return
        }
        mostrarErro(erro)
      })
  }

  const recarregar = async (): Promise<void> => {
    areaErro.hidden = true
    try {
      const [confirmadas, concluidas, pagamentos] = await Promise.all([
        window.electronAPI.reservas.listar({ status: 'confirmada' }),
        window.electronAPI.reservas.listar({ status: 'concluida' }),
        window.electronAPI.pagamentos.listar(),
      ])
      const elegiveis = [...confirmadas, ...concluidas].filter(
        (reserva) => !pagamentos.some((pagamento) => pagamento.reservaId === reserva.id),
      )

      const anterior = Number(selecaoReserva.value)
      selecaoReserva.replaceChildren(...elegiveis.map(criarOpcaoReserva))
      if (elegiveis.length === 0) {
        selecaoReserva.replaceChildren(criarOpcaoVazia())
        campoValor.placeholder = ''
        lista.replaceChildren(criarTexto('Nenhuma reserva elegível para pagamento.', 'muted'))
        return
      }

      selecaoReserva.value = elegiveis.some((reserva) => reserva.id === anterior)
        ? String(anterior)
        : String(elegiveis[0].id)
      sugerirValor(Number(selecaoReserva.value))

      if (pagamentos.length === 0) {
        lista.replaceChildren(criarTexto('Nenhum pagamento registrado.', 'muted'))
      } else {
        lista.replaceChildren(...pagamentos.map(criarItem))
      }
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  selecaoReserva.addEventListener('change', () => {
    areaErro.hidden = true
    sugerirValor(Number(selecaoReserva.value))
  })

  form.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const dados = new FormData(form)
    const reservaId = Number(dados.get('reservaId'))
    const valor = Number(dados.get('valor'))
    const formaBruta = String(dados.get('forma') ?? '')
    const forma = FORMAS.find((opcao) => opcao.valor === formaBruta)?.valor

    if (
      !Number.isInteger(reservaId) ||
      reservaId <= 0 ||
      !Number.isFinite(valor) ||
      valor <= 0 ||
      !forma
    ) {
      mostrarErro(new Error('Dados inválidos.'))
      return
    }

    areaErro.hidden = true
    window.electronAPI.pagamentos
      .registrar({ reservaId, valor, forma })
      .then(() => {
        campoValor.value = ''
        return recarregar()
      })
      .catch(mostrarErro)
  })

  lista.addEventListener('click', (evento) => {
    const alvo = evento.target
    if (!(alvo instanceof HTMLButtonElement)) return
    const acao = alvo.dataset.acao
    if (acao !== 'confirmar' && acao !== 'estornar') return

    const id = Number(alvo.dataset.id)
    if (!Number.isInteger(id) || id <= 0) return
    areaErro.hidden = true

    const operacao =
      acao === 'confirmar'
        ? window.electronAPI.pagamentos.confirmar(id)
        : window.electronAPI.pagamentos.estornar(id)
    operacao.then(() => recarregar()).catch(mostrarErro)
  })

  void recarregar()
}

function criarOpcaoReserva(reserva: { id: number; fim: string }): HTMLOptionElement {
  const opcao = document.createElement('option')
  opcao.value = String(reserva.id)
  opcao.textContent = `Reserva #${reserva.id} · até ${formatarData(reserva.fim)}`
  return opcao
}

function criarOpcaoVazia(): HTMLOptionElement {
  const opcao = document.createElement('option')
  opcao.value = ''
  opcao.textContent = 'Nenhuma reserva elegível'
  opcao.disabled = true
  return opcao
}

function criarItem(pagamento: Pagamento): HTMLElement {
  const item = document.createElement('article')
  item.className = 'item-pagamento'

  const titulo = document.createElement('strong')
  titulo.textContent = `Pagamento #${pagamento.id}`
  item.append(titulo)
  item.append(criarTexto(ROTULOS_STATUS[pagamento.status], `status-${pagamento.status}`))
  item.append(
    criarTexto(
      `Reserva #${pagamento.reservaId} · ${REAIS.format(pagamento.valor)} · ${rotuloForma(pagamento.forma)}`,
    ),
  )
  item.append(criarTexto(`Registrado em ${formatarData(pagamento.criadoEm)}`, 'muted'))
  if (pagamento.pagoEm) {
    item.append(criarTexto(`Pago em ${formatarData(pagamento.pagoEm)}`, 'muted'))
  }

  if (pagamento.status === 'pendente' || pagamento.status === 'pago') {
    const acoes = document.createElement('div')
    acoes.className = 'acoes-pagamento'
    if (pagamento.status === 'pendente') {
      acoes.append(criarBotao('Confirmar', 'confirmar', pagamento.id))
    } else {
      acoes.append(criarBotao('Estornar', 'estornar', pagamento.id))
    }
    item.append(acoes)
  }
  return item
}

function criarBotao(texto: string, acao: string, id: number): HTMLButtonElement {
  const botao = document.createElement('button')
  botao.className = `button button-pequeno${acao === 'estornar' ? ' button-perigo' : ''}`
  botao.type = 'button'
  botao.textContent = texto
  botao.dataset.acao = acao
  botao.dataset.id = String(id)
  return botao
}

function rotuloForma(forma: FormaPagamento): string {
  return FORMAS.find((opcao) => opcao.valor === forma)?.rotulo ?? forma
}

function formatarData(valor: string): string {
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleString('pt-BR')
}

function criarTexto(texto: string, classe?: string): HTMLElement {
  const elemento = document.createElement('p')
  elemento.textContent = texto
  if (classe) elemento.className = classe
  return elemento
}

function obrigar<T extends Element>(container: ParentNode, seletor: string): T {
  const elemento = container.querySelector<T>(seletor)
  if (!elemento) throw new Error(`Falha ao montar a tela de pagamentos: ${seletor}`)
  return elemento
}

function mensagemAmigavel(erro: unknown): string {
  if (erro instanceof Error) {
    if (erro.message.startsWith('IPC_INVALIDO:')) return MENSAGENS_ERRO.IPC_INVALIDO
    const mensagem = MENSAGENS_ERRO[erro.message]
    if (mensagem) return mensagem
  }
  return 'Não foi possível concluir a operação.'
}
