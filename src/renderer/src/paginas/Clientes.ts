import type { Cliente, ClientesListarFiltros, Endereco } from '../../../shared/contratos/modelos'

const MENSAGENS_ERRO: Record<string, string> = {
  CLIENTE_NAO_ENCONTRADO: 'Cliente não encontrado.',
  EMAIL_DUPLICADO: 'Já existe cliente com esse e-mail.',
  CEP_INVALIDO: 'CEP inválido. Informe 8 dígitos.',
  CEP_NAO_ENCONTRADO: 'CEP não encontrado.',
}

/** Tela de clientes: só chama a API tipada; nunca Node, IPC cru, fetch ou SQL. */
export function montarClientes(container: HTMLElement): void {
  container.innerHTML = `
    <form class="form-cliente">
      <label>Nome <input name="nome" required maxlength="120" /></label>
      <label>E-mail <input name="email" type="email" maxlength="120" /></label>
      <label>Telefone <input name="telefone" maxlength="20" /></label>
      <div class="campo-cep">
        <label>CEP <input name="cep" maxlength="9" placeholder="00000-000" /></label>
        <button class="button button-cep" type="button" data-acao="buscar-cep">Buscar CEP</button>
      </div>
      <label>Número <input name="numero" maxlength="10" /></label>
      <label>Complemento <input name="complemento" maxlength="120" /></label>
      <label>Logradouro <input name="logradouro" readonly /></label>
      <label>Bairro <input name="bairro" readonly /></label>
      <label>Cidade <input name="cidade" readonly /></label>
      <label>UF <input name="uf" maxlength="2" readonly /></label>
      <button class="button" type="submit">Cadastrar cliente</button>
    </form>

    <div class="filtros">
      <label>Filtrar por nome <input id="filtro-nome-clientes" maxlength="120" /></label>
    </div>

    <p id="clientes-erro" class="erro" role="alert" hidden></p>
    <div id="clientes-lista" class="lista-clientes"><p class="muted">Carregando…</p></div>
  `

  const form = obrigar<HTMLFormElement>(container, '.form-cliente')
  const filtroNome = obrigar<HTMLInputElement>(container, '#filtro-nome-clientes')
  const areaErro = obrigar<HTMLElement>(container, '#clientes-erro')
  const lista = obrigar<HTMLElement>(container, '#clientes-lista')

  const mostrarErro = (erro: unknown): void => {
    areaErro.textContent = mensagemAmigavel(erro)
    areaErro.hidden = false
  }

  const recarregar = async (): Promise<void> => {
    areaErro.hidden = true
    const filtros: ClientesListarFiltros = {}
    const nome = filtroNome.value.trim()
    if (nome !== '') filtros.nome = nome

    try {
      const clientes = await window.electronAPI.clientes.listar(filtros)
      if (clientes.length === 0) {
        lista.replaceChildren(criarTexto('Nenhum cliente encontrado.', 'muted'))
        return
      }
      lista.replaceChildren(...clientes.map(criarItem))
    } catch (erro) {
      mostrarErro(erro)
    }
  }

  const preencherEndereco = (endereco: Endereco): void => {
    const campos: Record<string, string> = {
      cep: endereco.cep,
      logradouro: endereco.logradouro,
      bairro: endereco.bairro,
      cidade: endereco.cidade,
      uf: endereco.uf,
    }
    for (const [nome, valor] of Object.entries(campos)) {
      const campo = form.elements.namedItem(nome)
      if (campo instanceof HTMLInputElement) campo.value = valor
    }
  }

  container.addEventListener('click', (evento) => {
    const alvo = evento.target
    if (!(alvo instanceof HTMLButtonElement)) return

    if (alvo.dataset.acao === 'buscar-cep') {
      const cep = obrigar<HTMLInputElement>(form, 'input[name="cep"]').value.trim()
      if (cep === '') {
        mostrarErro(new Error('CEP_INVALIDO'))
        return
      }
      window.electronAPI.clientes.consultarCep({ cep }).then(preencherEndereco).catch(mostrarErro)
      return
    }

    if (alvo.dataset.acao === 'inativar') {
      window.electronAPI.clientes
        .inativar(Number(alvo.dataset.id))
        .then(() => recarregar())
        .catch(mostrarErro)
    }
  })

  filtroNome.addEventListener('change', () => void recarregar())

  form.addEventListener('submit', (evento) => {
    evento.preventDefault()
    const dados = new FormData(form)

    window.electronAPI.clientes
      .criar({
        nome: textoObrigatorio(dados, 'nome'),
        email: textoOpcional(dados, 'email'),
        telefone: textoOpcional(dados, 'telefone'),
        cep: textoOpcional(dados, 'cep'),
        numero: textoOpcional(dados, 'numero'),
        complemento: textoOpcional(dados, 'complemento'),
        logradouro: textoOpcional(dados, 'logradouro'),
        bairro: textoOpcional(dados, 'bairro'),
        cidade: textoOpcional(dados, 'cidade'),
        uf: textoOpcional(dados, 'uf'),
      })
      .then(() => {
        form.reset()
        return recarregar()
      })
      .catch(mostrarErro)
  })

  void recarregar()
}

function textoObrigatorio(dados: FormData, nome: string): string {
  return String(dados.get(nome) ?? '').trim()
}

function textoOpcional(dados: FormData, nome: string): string | null {
  const valor = textoObrigatorio(dados, nome)
  return valor === '' ? null : valor
}

function criarItem(cliente: Cliente): HTMLElement {
  const item = document.createElement('article')
  item.className = 'item-cliente'

  const titulo = document.createElement('strong')
  titulo.textContent = cliente.nome
  item.append(titulo)

  const contato = [cliente.email, cliente.telefone].filter(naoVazio).join(' · ')
  const endereco = [
    cliente.logradouro,
    cliente.numero,
    cliente.bairro,
    cliente.cidade,
    cliente.uf,
  ]
    .filter(naoVazio)
    .join(' · ')

  if (contato !== '') item.append(criarTexto(contato, 'muted'))
  if (endereco !== '') item.append(criarTexto(endereco, 'muted'))
  if (!cliente.ativo) item.append(criarTexto('Inativo', 'muted'))

  if (cliente.ativo) {
    const botao = document.createElement('button')
    botao.className = 'button button-perigo'
    botao.type = 'button'
    botao.textContent = 'Inativar'
    botao.dataset.acao = 'inativar'
    botao.dataset.id = String(cliente.id)
    item.append(botao)
  }

  return item
}

function naoVazio(valor: string | null): valor is string {
  return valor !== null && valor !== ''
}

function criarTexto(texto: string, classe?: string): HTMLElement {
  const elemento = document.createElement('p')
  elemento.textContent = texto
  if (classe) elemento.className = classe
  return elemento
}

function obrigar<T extends Element>(container: ParentNode, seletor: string): T {
  const elemento = container.querySelector<T>(seletor)
  if (!elemento) throw new Error(`Falha ao montar a tela de clientes: ${seletor}`)
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
