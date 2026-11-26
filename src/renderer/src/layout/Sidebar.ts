import {
  criarElemento,
  criarIcone,
  Componente,
  observarPerfil,
  perfilAtivo,
} from '../nucleo'
import { LogoZenite } from './LogoZenite'

const CLASSES = {
  aside:
    'flex h-screen w-16 shrink-0 flex-col border-r border-granito/30 bg-floresta text-pedra lg:w-sidebar',
  marca: 'flex items-center justify-center px-3 py-5 lg:justify-start lg:px-6',
  marcaCompacta: 'flex items-center justify-center lg:hidden',
  marcaCompleta: 'hidden items-center justify-center lg:flex',
  nav: 'flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4 lg:px-3',
  rotulo: 'hidden lg:inline',
  itemInativo:
    'flex items-center justify-center gap-3 rounded-control px-2 py-2 text-sm text-pedra transition-colors motion-reduce:transition-none hover:bg-pedra/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima lg:justify-start lg:px-3',
  itemAtivo:
    'flex items-center justify-center gap-3 rounded-control bg-lima/20 px-2 py-2 text-sm text-lima transition-colors motion-reduce:transition-none hover:bg-pedra/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima lg:justify-start lg:px-3',
  oculto: 'hidden',
  rodape: 'hidden border-t border-granito/30 px-6 py-4 text-xs text-granito lg:block',
} as const

interface ItemNav {
  readonly caminho: string
  readonly rotulo: string
  readonly icone: string
}

const ITENS: readonly ItemNav[] = [
  {
    caminho: '/dashboard',
    rotulo: 'Dashboard',
    icone: 'M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z',
  },
  {
    caminho: '/equipamentos',
    rotulo: 'Equipamentos',
    icone: 'M4 7h16v12H4zM9 7V5h6v2M4 12h16',
  },
  {
    caminho: '/clientes',
    rotulo: 'Clientes',
    icone: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0',
  },
  {
    caminho: '/fornecedores',
    rotulo: 'Fornecedores',
    icone: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6',
  },
  {
    caminho: '/manutencao',
    rotulo: 'Manutenção',
    icone: 'M14.7 6.3a4 4 0 0 0-5 5L3 18v3h3l8.7-8.7a4 4 0 0 0 5-5l-3 3-3-3 3-3z',
  },
  {
    caminho: '/reservas',
    rotulo: 'Reservas',
    icone:
      'M6 3v3M18 3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  },
  {
    caminho: '/devolucoes',
    rotulo: 'Devoluções',
    icone: 'M3 12a9 9 0 1 0 3-6.7M3 4v5h5',
  },
  {
    caminho: '/pagamentos',
    rotulo: 'Pagamentos',
    icone: 'M3 7h18v12H3zM3 11h18M7 15h4',
  },
  {
    caminho: '/usuarios',
    rotulo: 'Usuários',
    icone: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  },
  {
    caminho: '/sobre',
    rotulo: 'Sobre',
    icone: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 10v6M12 7h.01',
  },
]

const ITENS_CLIENTE: readonly ItemNav[] = [
  {
    caminho: '/cliente/disponibilidade',
    rotulo: 'Disponibilidade',
    icone: 'M4 7h16v12H4zM9 7V5h6v2M4 12h16',
  },
  {
    caminho: '/cliente/minhas-reservas',
    rotulo: 'Minhas reservas',
    icone:
      'M6 3v3M18 3v3M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z',
  },
  {
    caminho: '/cliente/nova-reserva',
    rotulo: 'Nova reserva',
    icone: 'M12 5v14M5 12h14',
  },
]

const CAMINHOS_CLIENTE: ReadonlySet<string> = new Set(
  ITENS_CLIENTE.map((item) => item.caminho),
)

const SOMENTE_ADMIN: ReadonlySet<string> = new Set([
  '/equipamentos',
  '/fornecedores',
  '/manutencao',
  '/pagamentos',
  '/usuarios',
])

export class Sidebar extends Componente {
  private readonly links = new Map<string, HTMLAnchorElement>()
  private readonly cancelarAssinatura: () => void
  private caminhoAtivo = '/dashboard'

  constructor() {
    super(criarElemento('aside', { className: CLASSES.aside }))
    this.montarEstrutura()
    this.cancelarAssinatura = observarPerfil(() => {
      this.aplicarPerfil()
    })
    this.aplicarPerfil()
  }

  private montarEstrutura(): void {
    const marca = criarElemento('div', {
      className: CLASSES.marca,
      filhos: [
        criarElemento('div', {
          className: CLASSES.marcaCompacta,
          filhos: [new LogoZenite({ variante: 'compacta', fundo: 'escuro' }).raiz],
        }),
        criarElemento('div', {
          className: CLASSES.marcaCompleta,
          filhos: [new LogoZenite({ variante: 'completa', fundo: 'escuro' }).raiz],
        }),
      ],
    })

    const nav = criarElemento('nav', {
      className: CLASSES.nav,
      atributos: { 'aria-label': 'Navegação principal' },
    })

    for (const item of [...ITENS, ...ITENS_CLIENTE]) {
      const rotulo = criarElemento('span', {
        className: CLASSES.rotulo,
        texto: item.rotulo,
      })
      const link = criarElemento('a', {
        className: CLASSES.itemInativo,
        atributos: { href: `#${item.caminho}`, title: item.rotulo },
        filhos: [criarIcone(item.icone), rotulo],
      })
      this.links.set(item.caminho, link)
      nav.append(link)
    }

    const rodape = criarElemento('div', {
      className: CLASSES.rodape,
      texto: 'Aluguel Outdoor · v0.1.0',
    })

    this.elemento.append(marca, nav, rodape)
  }

  definirAtivo(caminho: string): void {
    this.caminhoAtivo = caminho
    this.aplicarPerfil()
  }

  protected aoDesmontar(): void {
    this.cancelarAssinatura()
  }

  private aplicarPerfil(): void {
    const perfil = perfilAtivo()
    for (const [caminho, link] of this.links) {
      const permitido = this.permitidoPara(caminho, perfil)
      if (!permitido) {
        link.className = CLASSES.oculto
        link.removeAttribute('aria-current')
        link.tabIndex = -1
        continue
      }

      link.tabIndex = 0
      const ativo =
        caminho === this.caminhoAtivo ||
        (caminho === '/reservas' && this.caminhoAtivo === '/reservas/nova')
      link.className = ativo ? CLASSES.itemAtivo : CLASSES.itemInativo
      if (ativo) {
        link.setAttribute('aria-current', 'page')
      } else {
        link.removeAttribute('aria-current')
      }
    }
  }

  private permitidoPara(caminho: string, perfil: ReturnType<typeof perfilAtivo>): boolean {
    if (perfil === 'cliente') {
      return CAMINHOS_CLIENTE.has(caminho)
    }
    if (CAMINHOS_CLIENTE.has(caminho)) {
      return false
    }
    return !SOMENTE_ADMIN.has(caminho) || perfil === 'administrador'
  }
}
