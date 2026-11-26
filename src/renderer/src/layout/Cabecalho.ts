import { Botao } from '../componentes'
import {
  Componente,
  ROTULOS_PERFIL,
  criarElemento,
  observarSessao,
  perfilAtivo,
  sessaoAtiva,
} from '../nucleo'

const CLASSES = {
  cabecalho:
    'flex items-center justify-between gap-4 border-b border-granito/30 bg-superficie px-6 py-4',
  tituloBloco: 'flex min-w-0 flex-col',
  titulo: 'font-display text-xl text-floresta',
  contexto: 'mt-0.5 text-xs text-floresta/70',
  direita: 'flex shrink-0 items-center gap-3',
  dica: 'hidden text-xs text-floresta/70 lg:inline',
  dicaOculta: 'hidden',
  usuarioArea: 'hidden shrink-0 flex-col items-end sm:flex',
  usuarioNome: 'max-w-48 truncate text-sm font-semibold text-floresta',
  usuarioPerfil: 'text-xs text-floresta/70',
} as const

const CONTEXTOS: Readonly<Record<string, string>> = {
  Dashboard: 'Visão geral do dia · reservas, devoluções e frota',
  Equipamentos: 'Catálogo, disponibilidade e conservação',
  Clientes: 'Cadastro e busca rápida de clientes',
  Fornecedores: 'Compras e manutenção terceirizada',
  Manutenção: 'Ordens de serviço da frota',
  Reservas: 'Disponibilidade por data e confirmação',
  Devoluções: 'Atrasos, multas e baixa de equipamentos',
  Pagamentos: 'Recebimentos, pendências e estornos',
  Sobre: 'Versão e informações do sistema',
  'Página não encontrada': 'Verifique o endereço acessado',
  Login: 'Acesso ao balcão',
  'Primeira execução': 'Criação da primeira conta',
  'Escolha de conta': 'Entrar no balcão ou alugar equipamentos',
  'Cadastro de cliente': 'Crie sua conta para reservar',
  Disponibilidade: 'Equipamentos livres para o período escolhido',
  'Minhas reservas': 'Suas locações, status e previsão',
  'Nova reserva': 'Período, equipamentos e confirmação',
}

function contextoPara(titulo: string): string {
  return CONTEXTOS[titulo] ?? 'Aluguel Outdoor · uso interno'
}

export interface OpcoesCabecalho {
  readonly aoSair: () => void
}

export class Cabecalho extends Componente {
  private readonly titulo: HTMLHeadingElement
  private readonly contexto: HTMLParagraphElement
  private readonly usuarioNome: HTMLSpanElement
  private readonly usuarioPerfil: HTMLSpanElement
  private readonly dica: HTMLSpanElement
  private readonly cancelarAssinatura: () => void

  constructor(tituloInicial = 'Dashboard', opcoes?: OpcoesCabecalho) {
    const titulo = criarElemento('h1', {
      className: CLASSES.titulo,
      texto: tituloInicial,
    })
    const contexto = criarElemento('p', {
      className: CLASSES.contexto,
      texto: contextoPara(tituloInicial),
    })
    const usuarioNome = criarElemento('span', { className: CLASSES.usuarioNome })
    const usuarioPerfil = criarElemento('span', { className: CLASSES.usuarioPerfil })
    const botaoSair = new Botao({
      texto: 'Sair',
      variante: 'ghost',
      aoClicar: () => {
        opcoes?.aoSair()
      },
    })

    const dica = criarElemento('span', {
      className: CLASSES.dica,
      texto: 'Ctrl+K busca · Ctrl+N novo · F5 atualizar',
    })
    const direita = criarElemento('div', {
      className: CLASSES.direita,
      filhos: [
        dica,
        criarElemento('div', {
          className: CLASSES.usuarioArea,
          filhos: [usuarioNome, usuarioPerfil],
        }),
        botaoSair.raiz,
      ],
    })

    super(
      criarElemento('header', {
        className: CLASSES.cabecalho,
        atributos: { 'aria-label': 'Cabeçalho da aplicação' },
        filhos: [
          criarElemento('div', {
            className: CLASSES.tituloBloco,
            filhos: [titulo, contexto],
          }),
          direita,
        ],
      }),
    )

    this.titulo = titulo
    this.contexto = contexto
    this.usuarioNome = usuarioNome
    this.usuarioPerfil = usuarioPerfil
    this.dica = dica
    this.cancelarAssinatura = observarSessao(() => {
      this.sincronizarUsuario()
    })
    this.sincronizarUsuario()
  }

  definirTitulo(texto: string): void {
    this.titulo.textContent = texto
    this.contexto.textContent = contextoPara(texto)
  }

  protected aoDesmontar(): void {
    this.cancelarAssinatura()
  }

  private sincronizarUsuario(): void {
    const sessao = sessaoAtiva()
    const perfil = perfilAtivo()
    this.usuarioNome.textContent = sessao?.nome ?? 'Nenhum usuário'
    this.usuarioPerfil.textContent = ROTULOS_PERFIL[perfil]
    this.dica.className = perfil === 'cliente' ? CLASSES.dicaOculta : CLASSES.dica
  }
}
