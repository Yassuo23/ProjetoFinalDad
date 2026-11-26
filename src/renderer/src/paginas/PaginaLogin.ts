import type { Sessao } from '../../../shared/contratos/modelos'
import { Botao, Campo, Carregando } from '../componentes'
import { LogoZenite } from '../layout/LogoZenite'
import { Componente, criarElemento } from '../nucleo'
import {
  ServicoAutenticacao,
  mensagemErroEntrada,
  motivoErroAutenticacao,
} from '../servicos'

export interface OpcoesPaginaLogin {
  /** Chamado apenas após o main confirmar as credenciais. */
  readonly aoEntrar: (sessao: Sessao) => void
}

/** DS 8.1/8.2 + wireframe 8.1 — classes literais, sem interpolação. */
const CLASSES = {
  pagina: 'flex min-h-full items-center justify-center bg-pedra px-4 py-8 sm:px-6',
  cartao:
    'grid w-full max-w-4xl overflow-hidden rounded-card border border-granito/45 bg-superficie shadow-card md:grid-cols-2',
  marca: 'hidden items-center justify-center bg-pedra p-8 md:flex',
  marcaConteudo: 'flex max-w-xs flex-col items-start gap-5',
  marcaTitulo: 'font-display text-2xl text-floresta',
  marcaTexto: 'text-sm text-floresta/70',
  formulario: 'flex flex-col gap-5 p-6 sm:p-8',
  cabecalhoTexto: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  titulo: 'mt-1 font-display text-2xl text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  campos: 'flex flex-col gap-4',
  mostrar:
    'flex items-center gap-2 text-sm text-floresta',
  checkbox:
    'size-4 rounded-control border border-granito/45 text-floresta accent-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  erro: 'rounded-control border border-erro/40 bg-erro-suave px-3 py-2 text-sm text-erro',
  acoes: 'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
  ajuda: 'text-xs text-floresta/70',
  carregando: 'flex justify-center',
} as const

const ICONE_USUARIO = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0'
const ICONE_SENHA = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'

const MENSAGEM_GENERICA = 'Usuário ou senha inválidos.'

export class PaginaLogin extends Componente {
  private readonly servico = new ServicoAutenticacao()
  private readonly campoLogin: Campo
  private readonly campoSenha: Campo
  private readonly mostrarSenha: HTMLInputElement
  private readonly botaoEntrar: Botao
  private readonly areaErro: HTMLParagraphElement
  private readonly areaCarregando: HTMLDivElement
  private readonly formulario: HTMLFormElement
  private carregando = false
  private readonly aoSubmit = (evento: SubmitEvent): void => {
    evento.preventDefault()
    void this.enviar()
  }

  constructor(private readonly opcoes: OpcoesPaginaLogin) {
    const campoLogin = new Campo({
      id: 'login-usuario',
      rotulo: 'Usuário ou CPF',
      tipo: 'text',
      nome: 'login',
      placeholder: 'Seu usuário ou CPF',
      autocomplete: 'username',
      obrigatorio: true,
      icone: ICONE_USUARIO,
    })
    const campoSenha = new Campo({
      id: 'login-senha',
      rotulo: 'Senha',
      tipo: 'password',
      nome: 'senha',
      placeholder: 'Sua senha',
      autocomplete: 'current-password',
      obrigatorio: true,
      icone: ICONE_SENHA,
    })

    const mostrarSenha = criarElemento('input', {
      className: CLASSES.checkbox,
      atributos: { type: 'checkbox', id: 'login-mostrar-senha' },
    })
    const rotuloMostrar = criarElemento('label', {
      className: CLASSES.mostrar,
      atributos: { for: mostrarSenha.id },
      filhos: [mostrarSenha, 'Mostrar senha'],
    })
    mostrarSenha.addEventListener('change', () => {
      campoSenha.definirTipoVisibilidade(mostrarSenha.checked)
    })

    const areaErro = criarElemento('p', {
      className: CLASSES.erro,
      atributos: { role: 'alert', 'aria-live': 'polite' },
    })
    areaErro.hidden = true

    const areaCarregando = criarElemento('div', { className: CLASSES.carregando })
    areaCarregando.append(new Carregando({ mensagem: 'Entrando…' }).raiz)
    areaCarregando.hidden = true

    const botaoEntrar = new Botao({
      texto: 'Entrar',
      tipo: 'submit',
      variante: 'primario',
    })

    const formulario = criarElemento('form', {
      className: CLASSES.formulario,
      atributos: { novalidate: '', 'aria-label': 'Entrar no Zênite' },
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('p', {
              className: CLASSES.cabecalhoTexto,
              texto: 'Zênite — Aluguel Outdoor',
            }),
            criarElemento('h1', { className: CLASSES.titulo, texto: 'Entre para continuar' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Use seu usuário e sua senha para acessar o balcão.',
            }),
          ],
        }),
        criarElemento('div', {
          className: CLASSES.campos,
          filhos: [campoLogin.raiz, campoSenha.raiz, rotuloMostrar],
        }),
        areaErro,
        areaCarregando,
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [
            botaoEntrar.raiz,
            criarElemento('p', {
              className: CLASSES.ajuda,
              texto: 'Esqueci minha senha: fale com o administrador.',
            }),
          ],
        }),
      ],
    })

    const cartao = criarElemento('div', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('div', {
          className: CLASSES.marca,
          filhos: [
            criarElemento('div', {
              className: CLASSES.marcaConteudo,
              filhos: [
                new LogoZenite({ variante: 'completa', fundo: 'escuro' }).raiz,
                criarElemento('p', {
                  className: CLASSES.marcaTitulo,
                  texto: 'Equipamentos prontos para a trilha.',
                }),
                criarElemento('p', {
                  className: CLASSES.marcaTexto,
                  texto: 'Reservas, devoluções e frota em um só lugar.',
                }),
              ],
            }),
          ],
        }),
        formulario,
      ],
    })

    super(criarElemento('section', { className: CLASSES.pagina, filhos: [cartao] }))

    this.campoLogin = campoLogin
    this.campoSenha = campoSenha
    this.mostrarSenha = mostrarSenha
    this.botaoEntrar = botaoEntrar
    this.areaErro = areaErro
    this.areaCarregando = areaCarregando
    this.formulario = formulario
    formulario.addEventListener('submit', this.aoSubmit)
  }

  protected aoMontar(): void {
    this.campoLogin.focar()
  }

  protected aoDesmontar(): void {
    this.formulario.removeEventListener('submit', this.aoSubmit)
  }

  private async enviar(): Promise<void> {
    if (this.carregando) {
      return
    }

    const login = this.campoLogin.valor().trim()
    const senha = this.campoSenha.valor()
    this.mostrarErro(null)

    // Texto único para campo vazio e credencial recusada: sem vazar política.
    if (login.length === 0 || senha.length === 0) {
      this.mostrarErro(MENSAGEM_GENERICA)
      this.campoLogin.focar()
      return
    }

    this.definirCarregando(true)
    try {
      const sessao = await this.servico.entrar({ login, senha })
      this.campoSenha.definirValor('')
      this.opcoes.aoEntrar(sessao)
    } catch (erro) {
      this.campoSenha.definirValor('')
      this.mostrarErro(mensagemErroEntrada(motivoErroAutenticacao(erro)))
      this.campoSenha.focar()
    } finally {
      this.definirCarregando(false)
    }
  }

  private mostrarErro(mensagem: string | null): void {
    this.areaErro.textContent = mensagem ?? ''
    this.areaErro.hidden = mensagem === null
  }

  private definirCarregando(valor: boolean): void {
    this.carregando = valor
    this.botaoEntrar.definirDesabilitado(valor)
    this.botaoEntrar.definirTexto(valor ? 'Entrando…' : 'Entrar')
    this.campoLogin.definirDesabilitado(valor)
    this.campoSenha.definirDesabilitado(valor)
    this.mostrarSenha.disabled = valor
    this.areaCarregando.hidden = !valor
    this.formulario.setAttribute('aria-busy', valor ? 'true' : 'false')
  }
}
