import {
  Componente,
  criarElemento,
  definirPerfil,
  observarPerfil,
  perfilAtivo,
  ROTULOS_PERFIL,
} from '../nucleo'
import type { Perfil } from '../nucleo'

const CLASSES = {
  cabecalho:
    'flex items-center justify-between gap-4 border-b border-granito/30 bg-superficie px-6 py-4',
  tituloBloco: 'flex min-w-0 flex-col',
  titulo: 'font-display text-xl text-floresta',
  contexto: 'mt-0.5 text-xs text-floresta/70',
  direita: 'flex shrink-0 items-center gap-3',
  dica: 'hidden text-xs text-floresta/70 lg:inline',
  perfilArea: 'flex shrink-0 items-center gap-2',
  perfilLegenda: 'hidden text-xs text-floresta/70 xl:inline',
  alternador: 'flex items-center gap-1 rounded-control border border-granito/45 bg-superficie p-1',
  botaoPerfil:
    'rounded-control px-2.5 py-1 text-xs font-semibold text-floresta transition-colors hover:bg-floresta/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  botaoPerfilAtivo:
    'rounded-control bg-lima/20 px-2.5 py-1 text-xs font-semibold text-floresta ring-1 ring-inset ring-floresta transition-colors hover:bg-lima/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
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
}

function contextoPara(titulo: string): string {
  return CONTEXTOS[titulo] ?? 'Aluguel Outdoor · uso interno'
}

export class Cabecalho extends Componente {
  private readonly titulo: HTMLHeadingElement
  private readonly contexto: HTMLParagraphElement
  private readonly botoesPerfil: ReadonlyMap<Perfil, HTMLButtonElement>
  private readonly cancelarAssinatura: () => void

  constructor(tituloInicial = 'Dashboard') {
    const titulo = criarElemento('h1', {
      className: CLASSES.titulo,
      texto: tituloInicial,
    })
    const contexto = criarElemento('p', {
      className: CLASSES.contexto,
      texto: contextoPara(tituloInicial),
    })

    const criarBotaoPerfil = (perfil: Perfil): HTMLButtonElement => {
      const botao = criarElemento('button', {
        className: CLASSES.botaoPerfil,
        atributos: {
          type: 'button',
          title: ROTULOS_PERFIL[perfil],
          'aria-label': `Usar perfil de demonstração: ${ROTULOS_PERFIL[perfil]}`,
          'aria-pressed': 'false',
        },
        texto: perfil === 'atendente' ? 'Atendente' : 'Administrador',
      })
      botao.addEventListener('click', () => {
        definirPerfil(perfil)
      })
      return botao
    }

    const botaoAtendente = criarBotaoPerfil('atendente')
    const botaoAdministrador = criarBotaoPerfil('administrador')
    const alternador = criarElemento('div', {
      className: CLASSES.alternador,
      atributos: { role: 'group', 'aria-label': 'Perfil de demonstração' },
      filhos: [botaoAtendente, botaoAdministrador],
    })
    const areaPerfil = criarElemento('div', {
      className: CLASSES.perfilArea,
      filhos: [
        criarElemento('span', { className: CLASSES.perfilLegenda, texto: 'Perfil (demo)' }),
        alternador,
      ],
    })

    const direita = criarElemento('div', {
      className: CLASSES.direita,
      filhos: [
        criarElemento('span', {
          className: CLASSES.dica,
          texto: 'Ctrl+K busca · Ctrl+N novo · F5 atualizar',
        }),
        areaPerfil,
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
    this.botoesPerfil = new Map<Perfil, HTMLButtonElement>([
      ['atendente', botaoAtendente],
      ['administrador', botaoAdministrador],
    ])
    this.cancelarAssinatura = observarPerfil(() => {
      this.sincronizarPerfil()
    })
    this.sincronizarPerfil()
  }

  definirTitulo(texto: string): void {
    this.titulo.textContent = texto
    this.contexto.textContent = contextoPara(texto)
  }

  protected aoDesmontar(): void {
    this.cancelarAssinatura()
  }

  private sincronizarPerfil(): void {
    const ativo = perfilAtivo()
    for (const [perfil, botao] of this.botoesPerfil) {
      const selecionado = perfil === ativo
      botao.className = selecionado ? CLASSES.botaoPerfilAtivo : CLASSES.botaoPerfil
      botao.setAttribute('aria-pressed', selecionado ? 'true' : 'false')
    }
  }
}
