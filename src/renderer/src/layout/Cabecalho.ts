import { Badge } from '../componentes'
import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  cabecalho:
    'flex items-center justify-between gap-4 border-b border-granito/30 bg-superficie px-6 py-4',
  tituloBloco: 'flex min-w-0 flex-col',
  titulo: 'font-display text-xl text-floresta',
  contexto: 'mt-0.5 text-xs text-floresta/70',
  direita: 'flex shrink-0 items-center gap-3',
  dica: 'hidden text-xs text-floresta/70 lg:inline',
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

  constructor(tituloInicial = 'Dashboard') {
    const titulo = criarElemento('h1', {
      className: CLASSES.titulo,
      texto: tituloInicial,
    })
    const contexto = criarElemento('p', {
      className: CLASSES.contexto,
      texto: contextoPara(tituloInicial),
    })

    const direita = criarElemento('div', {
      className: CLASSES.direita,
      filhos: [
        criarElemento('span', {
          className: CLASSES.dica,
          texto: 'Ctrl+K busca · Ctrl+N novo · F5 atualizar',
        }),
        new Badge({ texto: 'Atendente de balcão', tom: 'neutro' }).raiz,
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
  }

  definirTitulo(texto: string): void {
    this.titulo.textContent = texto
    this.contexto.textContent = contextoPara(texto)
  }
}
