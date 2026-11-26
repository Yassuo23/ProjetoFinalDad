import type { Sessao } from '../../../shared/contratos/modelos'
import { Botao, Campo, Carregando } from '../componentes'
import { LogoZenite } from '../layout/LogoZenite'
import { Componente, criarElemento } from '../nucleo'
import {
  ServicoAutenticacao,
  TEXTO_POLITICA_LOGIN,
  TEXTO_POLITICA_SENHA,
  loginValido,
  mensagemErroBootstrap,
  motivoErroAutenticacao,
  nomeValido,
  senhaValida,
} from '../servicos'

export interface OpcoesPaginaPrimeiraExecucao {
  readonly aoCriar: (sessao: Sessao) => void
}

/** Wireframe 8.2 — faixa floresta, sem senha padrão e sem pré-preenchimento. */
const CLASSES = {
  pagina: 'flex min-h-full flex-col bg-pedra',
  faixa: 'flex flex-col items-center gap-3 bg-floresta px-4 py-6 sm:px-6',
  faixaTexto: 'text-center text-sm text-pedra',
  corpo: 'flex flex-1 items-start justify-center px-4 py-8 sm:px-6',
  cartao:
    'w-full max-w-xl rounded-card border border-granito/45 bg-superficie p-6 shadow-card sm:p-8',
  titulo: 'font-display text-2xl text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  aviso: 'mt-2 text-xs text-floresta/70',
  campos: 'mt-6 flex flex-col gap-4',
  regra: 'rounded-control bg-pedra px-3 py-2 text-xs text-floresta',
  mostrar: 'flex items-center gap-2 text-sm text-floresta',
  checkbox:
    'size-4 rounded-control border border-granito/45 text-floresta accent-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  erro: 'mt-4 rounded-control border border-erro/40 bg-erro-suave px-3 py-2 text-sm text-erro',
  carregando: 'mt-4 flex justify-center',
  acoes: 'mt-6 flex justify-end',
} as const

const ICONE_USUARIO = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0'
const ICONE_SENHA = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'

export class PaginaPrimeiraExecucao extends Componente {
  private readonly servico = new ServicoAutenticacao()
  private readonly campoNome: Campo
  private readonly campoLogin: Campo
  private readonly campoSenha: Campo
  private readonly campoConfirmacao: Campo
  private readonly mostrarSenhas: HTMLInputElement
  private readonly botaoCriar: Botao
  private readonly areaErro: HTMLParagraphElement
  private readonly areaCarregando: HTMLDivElement
  private readonly formulario: HTMLFormElement
  private carregando = false
  private readonly aoSubmit = (evento: SubmitEvent): void => {
    evento.preventDefault()
    void this.criar()
  }

  constructor(private readonly opcoes: OpcoesPaginaPrimeiraExecucao) {
    const campoNome = new Campo({
      id: 'bootstrap-nome',
      rotulo: 'Nome completo',
      nome: 'nome',
      placeholder: 'Como você quer ser chamado',
      autocomplete: 'name',
      obrigatorio: true,
    })
    const campoLogin = new Campo({
      id: 'bootstrap-usuario',
      rotulo: 'Usuário ou CPF',
      nome: 'login',
      placeholder: 'Escolha um usuário',
      autocomplete: 'username',
      obrigatorio: true,
      ajuda: TEXTO_POLITICA_LOGIN,
      icone: ICONE_USUARIO,
    })
    const campoSenha = new Campo({
      id: 'bootstrap-senha',
      rotulo: 'Senha',
      tipo: 'password',
      nome: 'senha',
      placeholder: 'Escolha uma senha',
      autocomplete: 'new-password',
      obrigatorio: true,
      icone: ICONE_SENHA,
    })
    const campoConfirmacao = new Campo({
      id: 'bootstrap-confirmacao',
      rotulo: 'Repetir senha',
      tipo: 'password',
      nome: 'confirmacao',
      placeholder: 'Digite a senha novamente',
      autocomplete: 'new-password',
      obrigatorio: true,
      icone: ICONE_SENHA,
    })

    const mostrarSenhas = criarElemento('input', {
      className: CLASSES.checkbox,
      atributos: { type: 'checkbox', id: 'bootstrap-mostrar-senhas' },
    })
    const rotuloMostrar = criarElemento('label', {
      className: CLASSES.mostrar,
      atributos: { for: mostrarSenhas.id },
      filhos: [mostrarSenhas, 'Mostrar senhas'],
    })
    mostrarSenhas.addEventListener('change', () => {
      campoSenha.definirTipoVisibilidade(mostrarSenhas.checked)
      campoConfirmacao.definirTipoVisibilidade(mostrarSenhas.checked)
    })

    const areaErro = criarElemento('p', {
      className: CLASSES.erro,
      atributos: { role: 'alert', 'aria-live': 'polite' },
    })
    areaErro.hidden = true

    const areaCarregando = criarElemento('div', { className: CLASSES.carregando })
    areaCarregando.append(new Carregando({ mensagem: 'Criando administrador…' }).raiz)
    areaCarregando.hidden = true

    const botaoCriar = new Botao({
      texto: 'Criar administrador',
      tipo: 'submit',
      variante: 'primario',
    })

    const formulario = criarElemento('form', {
      className: CLASSES.cartao,
      atributos: { novalidate: '', 'aria-label': 'Criar a primeira conta de administrador' },
      filhos: [
        criarElemento('h1', { className: CLASSES.titulo, texto: 'Bem-vindo ao Zênite' }),
        criarElemento('p', {
          className: CLASSES.subtitulo,
          texto: 'Crie a primeira conta de administrador.',
        }),
        criarElemento('p', {
          className: CLASSES.aviso,
          texto: 'Não existe senha padrão. Escolha a sua agora.',
        }),
        criarElemento('div', {
          className: CLASSES.campos,
          filhos: [
            campoNome.raiz,
            campoLogin.raiz,
            campoSenha.raiz,
            campoConfirmacao.raiz,
            criarElemento('p', { className: CLASSES.regra, texto: TEXTO_POLITICA_SENHA }),
            rotuloMostrar,
          ],
        }),
        areaErro,
        areaCarregando,
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [botaoCriar.raiz],
        }),
      ],
    })

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [
          criarElemento('div', {
            className: CLASSES.faixa,
            filhos: [
              new LogoZenite({ variante: 'completa', fundo: 'claro' }).raiz,
              criarElemento('p', {
                className: CLASSES.faixaTexto,
                texto: 'Primeira execução · Zênite — Aluguel Outdoor',
              }),
            ],
          }),
          criarElemento('div', { className: CLASSES.corpo, filhos: [formulario] }),
        ],
      }),
    )

    this.campoNome = campoNome
    this.campoLogin = campoLogin
    this.campoSenha = campoSenha
    this.campoConfirmacao = campoConfirmacao
    this.mostrarSenhas = mostrarSenhas
    this.botaoCriar = botaoCriar
    this.areaErro = areaErro
    this.areaCarregando = areaCarregando
    this.formulario = formulario
    formulario.addEventListener('submit', this.aoSubmit)
  }

  protected aoMontar(): void {
    this.campoNome.focar()
  }

  protected aoDesmontar(): void {
    this.formulario.removeEventListener('submit', this.aoSubmit)
  }

  private async criar(): Promise<void> {
    if (this.carregando) {
      return
    }

    const nome = this.campoNome.valor().trim()
    const login = this.campoLogin.valor().trim()
    const senha = this.campoSenha.valor()
    const confirmacao = this.campoConfirmacao.valor()
    this.mostrarErro(null)

    let mensagem: string | null = null
    if (!nomeValido(nome)) {
      mensagem = 'Informe o nome do administrador.'
      this.campoNome.focar()
    } else if (!loginValido(login)) {
      mensagem = TEXTO_POLITICA_LOGIN
      this.campoLogin.focar()
    } else if (!senhaValida(senha)) {
      mensagem = TEXTO_POLITICA_SENHA
      this.campoSenha.focar()
    } else if (senha !== confirmacao) {
      mensagem = 'As senhas não conferem.'
      this.campoConfirmacao.focar()
    }
    if (mensagem !== null) {
      this.mostrarErro(mensagem)
      return
    }

    this.definirCarregando(true)
    try {
      const sessao = await this.servico.bootstrap({ nome, login, senha })
      this.limparSenhas()
      this.opcoes.aoCriar(sessao)
    } catch (erro) {
      this.limparSenhas()
      this.mostrarErro(mensagemErroBootstrap(motivoErroAutenticacao(erro)))
      this.campoSenha.focar()
    } finally {
      this.definirCarregando(false)
    }
  }

  private limparSenhas(): void {
    this.campoSenha.definirValor('')
    this.campoConfirmacao.definirValor('')
    this.mostrarSenhas.checked = false
    this.campoSenha.definirTipoVisibilidade(false)
    this.campoConfirmacao.definirTipoVisibilidade(false)
  }

  private mostrarErro(mensagem: string | null): void {
    this.areaErro.textContent = mensagem ?? ''
    this.areaErro.hidden = mensagem === null
  }

  private definirCarregando(valor: boolean): void {
    this.carregando = valor
    this.botaoCriar.definirDesabilitado(valor)
    this.botaoCriar.definirTexto(valor ? 'Criando…' : 'Criar administrador')
    for (const campo of [this.campoNome, this.campoLogin, this.campoSenha, this.campoConfirmacao]) {
      campo.definirDesabilitado(valor)
    }
    this.mostrarSenhas.disabled = valor
    this.areaCarregando.hidden = !valor
    this.formulario.setAttribute('aria-busy', valor ? 'true' : 'false')
  }
}
