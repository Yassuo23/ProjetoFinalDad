import type { AppInfo, PingPayload } from '../../../shared/contratos/modelos'
import { Componente, criarElemento, substituirConteudo } from '../nucleo'
import { ServicoAplicacao, ServicoPing } from '../servicos'

const CLASSES = {
  pagina: 'flex max-w-4xl flex-col gap-6',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  grade: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  cartao: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  tituloCartao: 'mb-3 text-xs font-semibold uppercase tracking-wider text-floresta',
  lista: 'm-0 text-sm',
  linha: 'grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5',
  rotulo: 'opacity-60 text-grafite',
  valor: 'm-0 font-mono text-grafite',
  texto: 'text-sm text-grafite',
  aviso: 'text-sm text-floresta/70',
  erro: 'flex flex-col items-start gap-3 rounded-card border border-erro/40 bg-erro-suave p-5',
  erroTexto: 'max-w-md text-sm text-grafite',
  botao:
    'cursor-pointer rounded-control bg-lima px-4 py-2.5 text-sm font-semibold text-grafite transition-colors hover:bg-geleira focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
} as const

const ROTULOS: ReadonlyArray<readonly [string, keyof AppInfo]> = [
  ['Nome', 'name'],
  ['Versão', 'version'],
  ['Electron', 'electron'],
  ['Node', 'node'],
  ['Plataforma', 'platform'],
  ['Arquitetura', 'arch'],
]

/** Página de diagnóstico: preserva o teste de IPC appInfo + ping. */
export class PaginaSobre extends Componente {
  private readonly servicoAplicacao = new ServicoAplicacao()
  private readonly servicoPing = new ServicoPing()
  private readonly pingTexto = criarElemento('p', {
    className: CLASSES.aviso,
    texto: 'Use Arquivo → Enviar ping no menu nativo para testar o IPC.',
    atributos: { 'aria-live': 'polite' },
  })
  private desinscreverPing: (() => void) | null = null

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
    this.montarEstrutura()
  }

  protected aoMontar(): void {
    this.desinscreverPing = this.servicoPing.observar((payload) => {
      this.mostrarPing(payload)
    })
    void this.carregar()
  }

  protected aoDesmontar(): void {
    this.desinscreverPing?.()
    this.desinscreverPing = null
  }

  private montarEstrutura(): void {
    const aplicacao = criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h2', { className: CLASSES.tituloCartao, texto: 'Aplicação' }),
        criarElemento('dl', {
          className: CLASSES.lista,
          atributos: { id: 'app-info', 'aria-live': 'polite' },
          filhos: [criarElemento('span', { className: CLASSES.texto, texto: 'Carregando…' })],
        }),
      ],
    })

    const eventos = criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('h2', { className: CLASSES.tituloCartao, texto: 'Eventos IPC' }),
        this.pingTexto,
      ],
    })

    substituirConteudo(
      this.elemento,
      criarElemento('div', {
        filhos: [
          criarElemento('h2', { className: CLASSES.titulo, texto: 'Sobre' }),
          criarElemento('p', {
            className: CLASSES.subtitulo,
            texto: 'Diagnóstico da ponte renderer → main.',
          }),
        ],
      }),
      criarElemento('div', { className: CLASSES.grade, filhos: [aplicacao, eventos] }),
    )
  }

  private async carregar(): Promise<void> {
    const destino = this.elemento.querySelector<HTMLElement>('#app-info')
    if (!destino) {
      return
    }

    try {
      const info = await this.servicoAplicacao.informacoes()
      substituirConteudo(
        destino,
        ...ROTULOS.map(([rotulo, chave]) =>
          criarElemento('div', {
            className: CLASSES.linha,
            filhos: [
              criarElemento('dt', { className: CLASSES.rotulo, texto: rotulo }),
              criarElemento('dd', {
                className: CLASSES.valor,
                texto: String(info[chave]),
              }),
            ],
          }),
        ),
      )
    } catch {
      this.mostrarErro(destino)
    }
  }

  private mostrarErro(destino: HTMLElement): void {
    const tentar = criarElemento('button', {
      className: CLASSES.botao,
      atributos: { type: 'button' },
      texto: 'Tentar novamente',
    })
    tentar.addEventListener('click', () => {
      void this.carregar()
    })

    substituirConteudo(
      destino,
      criarElemento('div', {
        className: CLASSES.erro,
        filhos: [
          criarElemento('p', {
            className: CLASSES.erroTexto,
            texto: 'Não foi possível ler as informações da aplicação.',
          }),
          tentar,
        ],
      }),
    )
  }

  private mostrarPing(payload: PingPayload): void {
    const horario = new Date(payload.timestamp)
    const texto = Number.isNaN(horario.getTime())
      ? payload.message
      : `${payload.message} · ${horario.toLocaleTimeString('pt-BR')}`
    this.pingTexto.textContent = texto
  }
}
