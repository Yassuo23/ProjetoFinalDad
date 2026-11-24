import type { Cliente, ClientesListarFiltros, Endereco } from '../../../shared/contratos/modelos'
import { criarElemento } from '../nucleo'
import {
  CLASSES,
  criarBotao,
  criarEntrada,
  rotular,
} from './ControlesFuncionais'
import { PaginaFuncional } from './PaginaFuncional'

const MENSAGENS_ERRO: Record<string, string> = {
  CLIENTE_NAO_ENCONTRADO: 'Cliente não encontrado.',
  EMAIL_DUPLICADO: 'Já existe cliente com esse e-mail.',
  CEP_INVALIDO: 'CEP inválido. Informe 8 dígitos.',
  CEP_NAO_ENCONTRADO: 'CEP não encontrado.',
}

/** Tela de clientes: só chama a API tipada; nunca Node, IPC cru, fetch ou SQL. */
export function montarClientes(container: HTMLElement): void {
  const campoNome = criarEntrada({ nome: 'nome', obrigatorio: true, maxlength: '120' })
  const campoEmail = criarEntrada({ nome: 'email', tipo: 'email', maxlength: '120' })
  const campoTelefone = criarEntrada({ nome: 'telefone', tipo: 'tel', maxlength: '20' })
  const campoCep = criarEntrada({
    nome: 'cep',
    maxlength: '9',
    placeholder: '00000-000',
  })
  const botaoBuscarCep = criarBotao('Buscar CEP', {
    variante: 'secundario',
    acao: 'buscar-cep',
  })
  const campoNumero = criarEntrada({ nome: 'numero', maxlength: '10' })
  const campoComplemento = criarEntrada({ nome: 'complemento', maxlength: '120' })
  const campoLogradouro = criarEntrada({ nome: 'logradouro', somenteLeitura: true })
  const campoBairro = criarEntrada({ nome: 'bairro', somenteLeitura: true })
  const campoCidade = criarEntrada({ nome: 'cidade', somenteLeitura: true })
  const campoUf = criarEntrada({ nome: 'uf', maxlength: '2', somenteLeitura: true })

  const form = criarElemento('form', {
    className: CLASSES.formulario,
    atributos: { 'aria-label': 'Cadastro de cliente' },
    filhos: [
      rotular('Nome', campoNome),
      rotular('E-mail', campoEmail),
      rotular('Telefone', campoTelefone),
      criarElemento('div', {
        className: `${CLASSES.larguraTotal} flex items-end gap-3`,
        filhos: [rotular('CEP', campoCep), botaoBuscarCep],
      }),
      rotular('Número', campoNumero),
      rotular('Complemento', campoComplemento),
      rotular('Logradouro', campoLogradouro),
      rotular('Bairro', campoBairro),
      rotular('Cidade', campoCidade),
      rotular('UF', campoUf),
      criarElemento('div', {
        className: CLASSES.larguraTotal,
        filhos: [criarBotao('Cadastrar cliente', { tipo: 'submit' })],
      }),
    ],
  })

  const filtroNome = criarEntrada({ nome: 'filtro-nome-clientes', id: 'filtro-nome-clientes', maxlength: '120' })
  const areaErro = criarElemento('p', {
    className: CLASSES.erro,
    atributos: { id: 'clientes-erro', role: 'alert', hidden: '' },
  })
  const lista = criarElemento('div', {
    className: CLASSES.lista,
    atributos: { id: 'clientes-lista' },
    filhos: [criarElemento('p', { className: CLASSES.muted, texto: 'Carregando…' })],
  })

  container.replaceChildren(
    criarElemento('div', { className: CLASSES.cartao, filhos: [form] }),
    criarElemento('div', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('div', {
          className: CLASSES.formularioSimples,
          filhos: [rotular('Filtrar por nome', filtroNome)],
        }),
        areaErro,
        criarElemento('h3', { className: CLASSES.tituloSecao, texto: 'Clientes cadastrados' }),
        lista,
      ],
    }),
  )

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
        lista.replaceChildren(criarTexto('Nenhum cliente encontrado.', CLASSES.muted))
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
      const cep = campoCep.value.trim()
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
  const filhos: Array<Node | string> = [
    criarElemento('strong', { className: CLASSES.itemTitulo, texto: cliente.nome }),
  ]

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

  if (contato !== '') filhos.push(criarTexto(contato, CLASSES.muted))
  if (endereco !== '') filhos.push(criarTexto(endereco, CLASSES.muted))
  if (!cliente.ativo) filhos.push(criarTexto('Inativo', CLASSES.muted))

  if (cliente.ativo) {
    const botao = criarBotao('Inativar', {
      variante: 'perigo',
      acao: 'inativar',
      pequeno: true,
    })
    botao.dataset.id = String(cliente.id)
    filhos.push(criarElemento('div', { className: CLASSES.acoesItem, filhos: [botao] }))
  }

  return criarElemento('article', { className: CLASSES.item, filhos })
}

function naoVazio(valor: string | null): valor is string {
  return valor !== null && valor !== ''
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

/** Tela funcional de clientes adaptada ao roteador do shell. */
export class PaginaClientes extends PaginaFuncional {
  constructor() {
    super('Clientes', 'Cadastro, busca e consulta de CEP.', montarClientes)
  }
}
