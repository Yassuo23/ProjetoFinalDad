import type { CadastrarClienteEntrada, Sessao } from '../../../shared/contratos/modelos'
import { Botao, Campo, Carregando } from '../componentes'
import { LogoZenite } from '../layout/LogoZenite'
import { Componente, criarElemento } from '../nucleo'
import {
  ServicoAutenticacao,
  TEXTO_POLITICA_LOGIN,
  TEXTO_POLITICA_SENHA,
  mensagemErroCadastroCliente,
  motivoErroAutenticacao,
  validarCadastroCliente,
} from '../servicos'
import type {
  DadosFormularioCadastroCliente,
  ErrosCadastroCliente,
} from '../servicos'
import { formatadorPtBr } from '../util'

export interface OpcoesPaginaCadastroCliente {
  /** Chamado apenas depois que o main devolve a sessão já autenticada. */
  readonly aoCriar: (sessao: Sessao) => void
  readonly aoVoltar: () => void
  /** Cliente que já tem conta volta ao Login (o mesmo `auth:entrar` serve a todos). */
  readonly aoEntrar: () => void
}

interface CamposCadastro {
  nome: Campo
  cpf: Campo
  login: Campo
  senha: Campo
  confirmarSenha: Campo
  telefone: Campo
  email: Campo
  cep: Campo
  logradouro: Campo
  numero: Campo
  complemento: Campo
  bairro: Campo
  cidade: Campo
  uf: Campo
}

/** DS 8.2/8.3 — strings literais; máscaras vêm de FormatadorPtBr. */
const CLASSES = {
  pagina: 'flex min-h-full items-start justify-center bg-pedra px-4 py-8 sm:px-6',
  cartao:
    'w-full max-w-3xl rounded-card border border-granito/45 bg-superficie p-6 shadow-card sm:p-8',
  marca: 'mb-6 flex justify-center',
  titulo: 'font-display text-2xl text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  politica: 'mt-4 text-xs text-floresta/70',
  grade: 'mt-6 grid grid-cols-1 gap-4 md:grid-cols-2',
  larga: 'md:col-span-2',
  mostrar: 'flex items-center gap-2 text-sm text-floresta',
  checkbox:
    'size-4 rounded-control border border-granito/45 text-floresta accent-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  erro: 'mt-4 rounded-control border border-erro/40 bg-erro-suave px-3 py-2 text-sm text-erro',
  carregando: 'mt-4 flex justify-center',
  acoes: 'mt-6 flex flex-wrap items-center justify-end gap-2',
} as const

const ICONE_USUARIO = 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0'
const ICONE_CPF = 'M4 5h16v14H4zM7 9h10M7 13h6'
const ICONE_SENHA = 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4'

function textoOpcional(campo: Campo): string | null {
  const valor = campo.valor().trim()
  return valor === '' ? null : valor
}

function digitosOpcionais(campo: Campo): string | null {
  const valor = campo.valor().trim()
  if (valor === '') {
    return null
  }
  const digitos = formatadorPtBr.digitos(valor)
  return digitos === '' ? null : digitos
}

export class PaginaCadastroCliente extends Componente {
  private readonly servico = new ServicoAutenticacao()
  private readonly campos: CamposCadastro
  private readonly mostrarSenha: HTMLInputElement
  private readonly botaoCriar: Botao
  private readonly botaoVoltar: Botao
  private readonly areaErro: HTMLParagraphElement
  private readonly areaCarregando: HTMLDivElement
  private readonly formulario: HTMLFormElement
  private carregando = false
  private readonly aoSubmit = (evento: SubmitEvent): void => {
    evento.preventDefault()
    void this.enviar()
  }

  constructor(private readonly opcoes: OpcoesPaginaCadastroCliente) {
    const campos: CamposCadastro = {
      nome: new Campo({
        id: 'cadastro-cliente-nome',
        rotulo: 'Nome completo',
        nome: 'nome',
        autocomplete: 'name',
        placeholder: 'Seu nome',
        icone: ICONE_USUARIO,
        obrigatorio: true,
        aoAlterar: () => campos.nome.definirErro(null),
      }),
      cpf: new Campo({
        id: 'cadastro-cliente-cpf',
        rotulo: 'CPF',
        nome: 'cpf',
        placeholder: '000.000.000-00',
        icone: ICONE_CPF,
        obrigatorio: true,
        aoAlterar: (valor) => {
          campos.cpf.definirValor(valor === '' ? '' : formatadorPtBr.cpf(valor))
          campos.cpf.definirErro(null)
        },
      }),
      login: new Campo({
        id: 'cadastro-cliente-login',
        rotulo: 'Usuário',
        nome: 'login',
        autocomplete: 'username',
        placeholder: 'Como você quer entrar',
        obrigatorio: true,
        aoAlterar: () => campos.login.definirErro(null),
      }),
      senha: new Campo({
        id: 'cadastro-cliente-senha',
        rotulo: 'Senha',
        tipo: 'password',
        nome: 'senha',
        autocomplete: 'new-password',
        obrigatorio: true,
        icone: ICONE_SENHA,
        aoAlterar: () => campos.senha.definirErro(null),
      }),
      confirmarSenha: new Campo({
        id: 'cadastro-cliente-confirmar-senha',
        rotulo: 'Confirmar senha',
        tipo: 'password',
        nome: 'confirmarSenha',
        autocomplete: 'new-password',
        obrigatorio: true,
        aoAlterar: () => campos.confirmarSenha.definirErro(null),
      }),
      telefone: new Campo({
        id: 'cadastro-cliente-telefone',
        rotulo: 'Telefone (opcional)',
        tipo: 'tel',
        nome: 'telefone',
        autocomplete: 'tel',
        placeholder: '(00) 00000-0000',
        aoAlterar: (valor) => {
          campos.telefone.definirValor(valor === '' ? '' : formatadorPtBr.telefone(valor))
          campos.telefone.definirErro(null)
        },
      }),
      email: new Campo({
        id: 'cadastro-cliente-email',
        rotulo: 'E-mail (opcional)',
        tipo: 'email',
        nome: 'email',
        autocomplete: 'email',
        placeholder: 'voce@exemplo.com',
        aoAlterar: () => campos.email.definirErro(null),
      }),
      cep: new Campo({
        id: 'cadastro-cliente-cep',
        rotulo: 'CEP (opcional)',
        nome: 'cep',
        autocomplete: 'postal-code',
        placeholder: '00000-000',
        aoAlterar: (valor) => {
          campos.cep.definirValor(valor === '' ? '' : formatadorPtBr.cep(valor))
          campos.cep.definirErro(null)
        },
      }),
      logradouro: new Campo({
        id: 'cadastro-cliente-logradouro',
        rotulo: 'Rua (opcional)',
        nome: 'logradouro',
        autocomplete: 'address-line1',
      }),
      numero: new Campo({
        id: 'cadastro-cliente-numero',
        rotulo: 'Número (opcional)',
        nome: 'numero',
        autocomplete: 'address-line2',
      }),
      complemento: new Campo({
        id: 'cadastro-cliente-complemento',
        rotulo: 'Complemento (opcional)',
        nome: 'complemento',
      }),
      bairro: new Campo({
        id: 'cadastro-cliente-bairro',
        rotulo: 'Bairro (opcional)',
        nome: 'bairro',
      }),
      cidade: new Campo({
        id: 'cadastro-cliente-cidade',
        rotulo: 'Cidade (opcional)',
        nome: 'cidade',
        autocomplete: 'address-level2',
      }),
      uf: new Campo({
        id: 'cadastro-cliente-uf',
        rotulo: 'Estado (opcional)',
        nome: 'uf',
        autocomplete: 'address-level1',
        placeholder: 'PR',
        aoAlterar: () => campos.uf.definirErro(null),
      }),
    }

    const mostrarSenha = criarElemento('input', {
      className: CLASSES.checkbox,
      atributos: { type: 'checkbox', id: 'cadastro-cliente-mostrar-senha' },
    })
    const rotuloMostrar = criarElemento('label', {
      className: CLASSES.mostrar,
      atributos: { for: mostrarSenha.id },
      filhos: [mostrarSenha, 'Mostrar senha'],
    })
    mostrarSenha.addEventListener('change', () => {
      const visivel = mostrarSenha.checked
      campos.senha.definirTipoVisibilidade(visivel)
      campos.confirmarSenha.definirTipoVisibilidade(visivel)
    })

    const areaErro = criarElemento('p', {
      className: CLASSES.erro,
      atributos: { role: 'alert', 'aria-live': 'polite' },
    })
    areaErro.hidden = true

    const areaCarregando = criarElemento('div', { className: CLASSES.carregando })
    areaCarregando.append(new Carregando({ mensagem: 'Criando sua conta…' }).raiz)
    areaCarregando.hidden = true

    const botaoCriar = new Botao({
      id: 'cadastro-cliente-criar',
      texto: 'Criar minha conta',
      tipo: 'submit',
      variante: 'primario',
    })
    const botaoVoltar = new Botao({
      id: 'cadastro-cliente-voltar',
      texto: 'Voltar',
      variante: 'secundario',
      aoClicar: opcoes.aoVoltar,
    })
    const botaoEntrar = new Botao({
      id: 'cadastro-cliente-entrar',
      texto: 'Já tenho conta. Entrar',
      variante: 'ghost',
      aoClicar: opcoes.aoEntrar,
    })

    const formulario = criarElemento('form', {
      className: CLASSES.cartao,
      atributos: { novalidate: '', 'aria-label': 'Criar conta de cliente' },
      filhos: [
        criarElemento('div', {
          className: CLASSES.marca,
          filhos: [new LogoZenite({ variante: 'completa', fundo: 'claro' }).raiz],
        }),
        criarElemento('h1', { className: CLASSES.titulo, texto: 'Crie sua conta' }),
        criarElemento('p', {
          className: CLASSES.subtitulo,
          texto: 'Depois de entrar, você pode reservar equipamentos e acompanhar suas reservas.',
        }),
        criarElemento('p', {
          className: CLASSES.politica,
          texto: `${TEXTO_POLITICA_LOGIN} ${TEXTO_POLITICA_SENHA}`,
        }),
        criarElemento('div', {
          className: CLASSES.grade,
          filhos: [
            campos.nome.raiz,
            campos.cpf.raiz,
            campos.login.raiz,
            campos.telefone.raiz,
            campos.email.raiz,
            campos.cep.raiz,
            campos.senha.raiz,
            campos.confirmarSenha.raiz,
            rotuloMostrar,
            criarElemento('div', {
              className: CLASSES.larga,
              filhos: [campos.logradouro.raiz],
            }),
            campos.numero.raiz,
            campos.complemento.raiz,
            campos.bairro.raiz,
            campos.cidade.raiz,
            campos.uf.raiz,
          ],
        }),
        areaErro,
        areaCarregando,
        criarElemento('div', {
          className: CLASSES.acoes,
          filhos: [botaoVoltar.raiz, botaoEntrar.raiz, botaoCriar.raiz],
        }),
      ],
    })

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [formulario],
      }),
    )

    this.campos = campos
    this.mostrarSenha = mostrarSenha
    this.botaoCriar = botaoCriar
    this.botaoVoltar = botaoVoltar
    this.areaErro = areaErro
    this.areaCarregando = areaCarregando
    this.formulario = formulario
    formulario.addEventListener('submit', this.aoSubmit)
  }

  protected aoMontar(): void {
    this.campos.nome.focar()
  }

  protected aoDesmontar(): void {
    this.formulario.removeEventListener('submit', this.aoSubmit)
  }

  private async enviar(): Promise<void> {
    if (this.carregando) {
      return
    }
    this.mostrarErro(null)

    const formulario: DadosFormularioCadastroCliente = {
      nome: this.campos.nome.valor(),
      cpf: this.campos.cpf.valor(),
      login: this.campos.login.valor(),
      senha: this.campos.senha.valor(),
      confirmarSenha: this.campos.confirmarSenha.valor(),
      telefone: this.campos.telefone.valor(),
      email: this.campos.email.valor(),
      cep: this.campos.cep.valor(),
      logradouro: this.campos.logradouro.valor(),
      numero: this.campos.numero.valor(),
      complemento: this.campos.complemento.valor(),
      bairro: this.campos.bairro.valor(),
      cidade: this.campos.cidade.valor(),
      uf: this.campos.uf.valor(),
    }

    const erros = validarCadastroCliente(formulario)
    this.aplicarErros(erros)
    if (Object.keys(erros).length > 0) {
      this.focarPrimeiroErro(erros)
      return
    }

    const dados: CadastrarClienteEntrada = {
      nome: formulario.nome.trim(),
      cpf: formatadorPtBr.digitos(formulario.cpf),
      login: formulario.login.trim(),
      senha: formulario.senha,
      telefone: digitosOpcionais(this.campos.telefone),
      email: textoOpcional(this.campos.email),
      cep: digitosOpcionais(this.campos.cep),
      logradouro: textoOpcional(this.campos.logradouro),
      numero: textoOpcional(this.campos.numero),
      complemento: textoOpcional(this.campos.complemento),
      bairro: textoOpcional(this.campos.bairro),
      cidade: textoOpcional(this.campos.cidade),
      uf: textoOpcional(this.campos.uf)?.toUpperCase() ?? null,
    }

    this.definirCarregando(true)
    try {
      const sessao = await this.servico.cadastrarCliente(dados)
      this.limparSenhas()
      this.opcoes.aoCriar(sessao)
    } catch (erro) {
      this.limparSenhas()
      this.mostrarErro(mensagemErroCadastroCliente(motivoErroAutenticacao(erro)))
    } finally {
      this.definirCarregando(false)
    }
  }

  private aplicarErros(erros: ErrosCadastroCliente): void {
    this.campos.nome.definirErro(erros.nome ?? null)
    this.campos.cpf.definirErro(erros.cpf ?? null)
    this.campos.login.definirErro(erros.login ?? null)
    this.campos.senha.definirErro(erros.senha ?? null)
    this.campos.confirmarSenha.definirErro(erros.confirmarSenha ?? null)
    this.campos.telefone.definirErro(erros.telefone ?? null)
    this.campos.email.definirErro(erros.email ?? null)
    this.campos.cep.definirErro(erros.cep ?? null)
    this.campos.uf.definirErro(erros.uf ?? null)
  }

  private focarPrimeiroErro(erros: ErrosCadastroCliente): void {
    const ordem: readonly (keyof ErrosCadastroCliente)[] = [
      'nome',
      'cpf',
      'login',
      'senha',
      'confirmarSenha',
      'telefone',
      'email',
      'cep',
      'uf',
    ]
    for (const chave of ordem) {
      if (erros[chave] !== undefined) {
        this.campos[chave].focar()
        return
      }
    }
  }

  private limparSenhas(): void {
    this.campos.senha.definirValor('')
    this.campos.confirmarSenha.definirValor('')
    this.mostrarSenha.checked = false
    this.campos.senha.definirTipoVisibilidade(false)
    this.campos.confirmarSenha.definirTipoVisibilidade(false)
  }

  private mostrarErro(mensagem: string | null): void {
    this.areaErro.textContent = mensagem ?? ''
    this.areaErro.hidden = mensagem === null
  }

  private definirCarregando(valor: boolean): void {
    this.carregando = valor
    this.botaoCriar.definirDesabilitado(valor)
    this.botaoCriar.definirTexto(valor ? 'Criando conta…' : 'Criar minha conta')
    this.botaoVoltar.definirDesabilitado(valor)
    for (const campo of Object.values(this.campos)) {
      campo.definirDesabilitado(valor)
    }
    this.mostrarSenha.disabled = valor
    this.areaCarregando.hidden = !valor
    this.formulario.setAttribute('aria-busy', valor ? 'true' : 'false')
  }
}
