import type { CalculoMulta } from '../../../shared/contratos/modelos'

const MENSAGENS_ERRO: Record<string, string> = {
  DEVOLUCAO_JA_REGISTRADA: 'Esta reserva já tem uma devolução registrada.',
  DEVOLUCAO_DATA_INVALIDA: 'A data de devolução não pode ser anterior ao início da reserva.',
  RESERVA_NAO_CONFIRMADA: 'Só é possível devolver uma reserva confirmada.',
  MULTA_BASE_INDISPONIVEL: 'Equipamento sem valor de aquisição para calcular a multa.',
  RESERVA_NAO_ENCONTRADA: 'Reserva não encontrada.',
  EQUIPAMENTO_NAO_ENCONTRADO: 'Equipamento não encontrado.',
  IPC_INVALIDO: 'Dados inválidos. Confira os campos.',
  'Dados inválidos.': 'Informe a reserva e a data/hora da devolução.',
}

const REAIS = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Tela de devoluções: só chama a API tipada; nunca Node, IPC cru, fetch ou SQL. */
export function montarDevolucoes(container: HTMLElement): void {
  container.innerHTML = `
    <form class="form-devolucao">
      <label>Reserva confirmada <select name="reservaId" required></select></label>
      <label>Data/hora da devolução <input name="devolvidoEm" type="datetime-local" required /></label>
      <label>Observações <textarea name="observacoes" maxlength="500" rows="2"></textarea></label>
      <div class="acoes-devolucao">
        <button class="button" type="button" data-acao="calcular">Calcular multa</button>
        <button class="button" type="button" data-acao="registrar">Registrar devolução</button>
      </div>
    </form>

    <p id="devolucoes-erro" class="erro" role="alert" hidden></p>
    <p id="devolucoes-aviso" class="muted" role="status" hidden></p>
    <div id="multa-resultado" class="multa-resultado" role="status" hidden></div>
  `

  const form = obrigar<HTMLFormElement>(container, '.form-devolucao')
  const selecao = obrigar<HTMLSelectElement>(form, 'select[name="reservaId"]')
  const campoData = obrigar<HTMLInputElement>(form, 'input[name="devolvidoEm"]')
  const campoObservacoes = obrigar<HTMLTextAreaElement>(form, 'textarea[name="observacoes"]')
  const botaoCalcular = obrigar<HTMLButtonElement>(form, 'button[data-acao="calcular"]')
  const botaoRegistrar = obrigar<HTMLButtonElement>(form, 'button[data-acao="registrar"]')
  const areaErro = obrigar<HTMLElement>(container, '#devolucoes-erro')
  const areaAviso = obrigar<HTMLElement>(container, '#devolucoes-aviso')
  const resultado = obrigar<HTMLElement>(container, '#multa-resultado')

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const limparMensagens = (): void => {
    areaErro.hidden = true
    areaAviso.hidden = true
  }

  const verificarRegistro = (reservaId: number): void => {
    botaoRegistrar.disabled = false
    window.electronAPI.devolucoes
      .buscarPorReserva(reservaId)
      .then((devolucao) => {
        areaAviso.textContent = `Devolução já registrada em ${formatarData(devolucao.devolvidoEm)}.`
        areaAviso.hidden = false
        botaoRegistrar.disabled = true
      })
      .catch((erro: unknown) => {
        if (!(erro instanceof Error) || erro.message !== 'RESERVA_NAO_ENCONTRADA') {
          mostrarErro(erro)
        }
      })
  }

  const recarregar = async (): Promise<void> => {
    limparMensagens()
    try {
      const reservas = await window.electronAPI.reservas.listar({ status: 'confirmada' })
      const anterior = Number(selecao.value)
      selecao.replaceChildren(
        ...reservas.map((reserva) => {
          const opcao = document.createElement('option')
          opcao.value = String(reserva.id)
          opcao.textContent = `Reserva #${reserva.id} · até ${formatarData(reserva.fim)}`
          return opcao
        }),
      )

      resultado.hidden = true
      if (reservas.length === 0) {
        botaoCalcular.disabled = true
        botaoRegistrar.disabled = true
        selecao.replaceChildren(criarOpcaoVazia())
        return
      }

      selecao.value = reservas.some((reserva) => reserva.id === anterior)
        ? String(anterior)
        : String(reservas[0].id)
      botaoCalcular.disabled = false
      verificarRegistro(Number(selecao.value))
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  selecao.addEventListener('change', () => {
    resultado.hidden = true
    limparMensagens()
    verificarRegistro(Number(selecao.value))
  })

  form.addEventListener('submit', (evento) => evento.preventDefault())

  botaoCalcular.addEventListener('click', () => {
    const dados = lerFormulario(selecao, campoData, campoObservacoes)
    if (!dados) {
      mostrarErro(new Error('Dados inválidos.'))
      return
    }

    limparMensagens()
    resultado.hidden = true
    window.electronAPI.multas
      .calcular({ reservaId: dados.reservaId, devolvidoEm: dados.devolvidoEm })
      .then((calculo) => {
        resultado.replaceChildren(...criarResumo(calculo))
        resultado.hidden = false
      })
      .catch(mostrarErro)
  })

  botaoRegistrar.addEventListener('click', () => {
    const dados = lerFormulario(selecao, campoData, campoObservacoes)
    if (!dados) {
      mostrarErro(new Error('Dados inválidos.'))
      return
    }

    limparMensagens()
    window.electronAPI.devolucoes
      .registrar(dados)
      .then(async (devolucao) => {
        campoData.value = ''
        campoObservacoes.value = ''
        await recarregar()
        areaAviso.textContent = `Devolução #${devolucao.id} registrada. Reserva concluída.`
        areaAviso.hidden = false
      })
      .catch(mostrarErro)
  })

  void recarregar()
}

function lerFormulario(
  selecao: HTMLSelectElement,
  campoData: HTMLInputElement,
  campoObservacoes: HTMLTextAreaElement,
): { reservaId: number; devolvidoEm: string; observacoes: string | null } | null {
  const reservaId = Number(selecao.value)
  const devolvidoEm = paraIso(campoData.value)
  const texto = campoObservacoes.value.trim()
  if (!Number.isInteger(reservaId) || reservaId <= 0 || !devolvidoEm) return null
  return { reservaId, devolvidoEm, observacoes: texto === '' ? null : texto }
}

function criarResumo(calculo: CalculoMulta): HTMLElement[] {
  const linhas: readonly [string, string][] = [
    ['Dias de atraso', String(calculo.diasAtraso)],
    ['Carência', `${calculo.diasCarencia} dias`],
    ['Base de cálculo', REAIS.format(calculo.baseCalculo)],
    ['Diária', REAIS.format(calculo.valorDiaria)],
    ['Valor da locação', REAIS.format(calculo.valorLocacao)],
    ['Multa bruta', REAIS.format(calculo.valorMultaBruta)],
    [
      'Teto',
      calculo.tetoAplicado ? `${REAIS.format(calculo.valorMulta)} (aplicado)` : 'Não incidiu',
    ],
    ['Multa cobrada', REAIS.format(calculo.valorMulta)],
    ['Valor final', REAIS.format(calculo.valorTotal)],
  ]

  const titulo = criarTexto('Resumo da multa', 'multa-titulo')
  const lista = document.createElement('dl')
  lista.className = 'multa-lista'
  for (const [rotulo, valor] of linhas) {
    const termo = document.createElement('dt')
    termo.textContent = rotulo
    const descricao = document.createElement('dd')
    descricao.textContent = valor
    lista.append(termo, descricao)
  }
  return [titulo, lista]
}

function criarOpcaoVazia(): HTMLOptionElement {
  const opcao = document.createElement('option')
  opcao.textContent = 'Nenhuma reserva confirmada'
  opcao.value = ''
  opcao.disabled = true
  return opcao
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

function paraIso(valor: string): string | null {
  if (valor === '') return null
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data.toISOString()
}

function obrigar<T extends Element>(container: ParentNode, seletor: string): T {
  const elemento = container.querySelector<T>(seletor)
  if (!elemento) throw new Error(`Falha ao montar a tela de devoluções: ${seletor}`)
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
