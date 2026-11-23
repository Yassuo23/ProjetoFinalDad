import { Componente, criarElemento } from '../nucleo'
import { Carregando } from './Carregando'

export interface ColunaTabela<T> {
  readonly chave: keyof T & string
  readonly rotulo: string
  readonly ordenavel?: boolean
  readonly alinhamento?: 'esquerda' | 'direita'
}

export interface OpcoesTabela<T> {
  readonly colunas: readonly ColunaTabela<T>[]
  readonly linhas: readonly T[]
  readonly carregando?: boolean
  readonly mensagemVazia?: string
  readonly aoSelecionar?: (linha: T) => void
}

interface Ordem<T> {
  readonly chave: keyof T & string
  readonly direcao: 'asc' | 'desc'
}

const CLASSES = {
  container:
    'w-full overflow-x-auto rounded-card border border-granito/45 bg-superficie shadow-card',
  tabela: 'w-full border-collapse text-left text-sm',
  cabecalho: 'bg-floresta text-pedra',
  thEsquerda: 'h-row px-4 text-xs font-semibold uppercase tracking-wider text-left',
  thDireita: 'h-row px-4 text-xs font-semibold uppercase tracking-wider text-right',
  botaoOrdenacao:
    'flex w-full items-center justify-start gap-1 text-left uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima',
  botaoOrdenacaoDireita:
    'flex w-full items-center justify-end gap-1 text-right uppercase tracking-wider focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lima',
  indicador: 'text-xs text-lima',
  linha: 'h-row border-t border-granito/30 transition-colors hover:bg-pedra/60',
  linhaSelecionavel:
    'h-row cursor-pointer border-t border-granito/30 transition-colors hover:bg-pedra/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  celulaEsquerda: 'px-4 py-2 text-grafite',
  celulaDireita: 'px-4 py-2 text-right text-grafite',
  vazia: 'h-32 text-center text-floresta/70',
  carregando: 'h-40',
} as const

function formatarValor(valor: unknown): string {
  if (valor === null || valor === undefined) {
    return '—'
  }
  if (valor instanceof Date) {
    return valor.toLocaleDateString('pt-BR')
  }
  return String(valor)
}

function comparar(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b
  }
  return formatarValor(a).localeCompare(formatarValor(b), 'pt-BR', {
    numeric: true,
    sensitivity: 'base',
  })
}

function criarCabecalho<T>(
  colunas: readonly ColunaTabela<T>[],
  ths: Map<string, HTMLTableCellElement>,
): HTMLTableSectionElement {
  const celulas = colunas.map((coluna) => {
    const direita = coluna.alinhamento === 'direita'
    const th = criarElemento('th', {
      className: direita ? CLASSES.thDireita : CLASSES.thEsquerda,
      atributos: { scope: 'col', 'aria-sort': 'none' },
    })

    if (coluna.ordenavel === true) {
      const indicador = criarElemento('span', {
        className: CLASSES.indicador,
        texto: '↕',
        atributos: { 'aria-hidden': 'true' },
      })
      const botao = criarElemento('button', {
        className: direita ? CLASSES.botaoOrdenacaoDireita : CLASSES.botaoOrdenacao,
        atributos: { type: 'button', 'aria-label': `Ordenar por ${coluna.rotulo}` },
        filhos: [coluna.rotulo, indicador],
      })
      th.append(botao)
    } else {
      th.textContent = coluna.rotulo
    }

    ths.set(coluna.chave, th)
    return th
  })

  return criarElemento('thead', {
    className: CLASSES.cabecalho,
    filhos: [criarElemento('tr', { filhos: celulas })],
  })
}

export class Tabela<T extends object> extends Componente {
  private readonly colunas: readonly ColunaTabela<T>[]
  private readonly ths: Map<string, HTMLTableCellElement>
  private readonly corpo: HTMLTableSectionElement
  private linhas: readonly T[]
  private carregando: boolean
  private ordem: Ordem<T> | null = null
  private readonly aoSelecionar: ((linha: T) => void) | undefined

  constructor(opcoes: OpcoesTabela<T>) {
    const ths = new Map<string, HTMLTableCellElement>()
    const cabecalho = criarCabecalho(opcoes.colunas, ths)
    const corpo = criarElemento('tbody')
    const tabela = criarElemento('table', {
      className: CLASSES.tabela,
      filhos: [cabecalho, corpo],
    })

    super(
      criarElemento('div', {
        className: CLASSES.container,
        filhos: [tabela],
      }),
    )

    this.colunas = opcoes.colunas
    this.ths = ths
    this.corpo = corpo
    this.linhas = opcoes.linhas
    this.carregando = opcoes.carregando === true
    this.aoSelecionar = opcoes.aoSelecionar

    for (const coluna of opcoes.colunas) {
      if (coluna.ordenavel !== true) {
        continue
      }
      const botao = ths.get(coluna.chave)?.querySelector('button')
      botao?.addEventListener('click', () => {
        this.ordenarPor(coluna.chave)
      })
    }

    this.renderizarCorpo(opcoes.mensagemVazia ?? 'Nenhum registro encontrado.')
  }

  private ordenarPor(chave: keyof T & string): void {
    const direcao = this.ordem?.chave === chave && this.ordem.direcao === 'asc' ? 'desc' : 'asc'
    this.ordem = { chave, direcao }
    this.atualizarAriaSort()

    const fator = direcao === 'asc' ? 1 : -1
    this.linhas = [...this.linhas].sort((a, b) => fator * comparar(a[chave], b[chave]))
    this.renderizarCorpo()
  }

  private atualizarAriaSort(): void {
    for (const [chave, th] of this.ths) {
      const ativa = this.ordem?.chave === chave
      const ascendente = this.ordem?.direcao === 'asc'
      th.setAttribute('aria-sort', ativa ? (ascendente ? 'ascending' : 'descending') : 'none')
      const indicador = th.querySelector<HTMLElement>('[aria-hidden="true"]')
      if (indicador !== null) {
        indicador.textContent = ativa ? (ascendente ? '↑' : '↓') : '↕'
      }
    }
  }

  private renderizarCorpo(mensagemVazia = 'Nenhum registro encontrado.'): void {
    if (this.carregando) {
      const slot = criarElemento('div', { className: CLASSES.carregando })
      const carregando = new Carregando({ mensagem: 'Carregando registros…' })
      this.corpo.replaceChildren(
        criarElemento('tr', {
          filhos: [
            criarElemento('td', {
              atributos: { colspan: String(this.colunas.length) },
              filhos: [slot],
            }),
          ],
        }),
      )
      carregando.montar(slot)
      return
    }

    if (this.linhas.length === 0) {
      this.corpo.replaceChildren(
        criarElemento('tr', {
          filhos: [
            criarElemento('td', {
              className: CLASSES.vazia,
              atributos: { colspan: String(this.colunas.length) },
              texto: mensagemVazia,
            }),
          ],
        }),
      )
      return
    }

    const selecionavel = this.aoSelecionar !== undefined
    this.corpo.replaceChildren(
      ...this.linhas.map((linha) => {
        const tr = criarElemento('tr', {
          className: selecionavel ? CLASSES.linhaSelecionavel : CLASSES.linha,
          filhos: this.colunas.map((coluna) =>
            criarElemento('td', {
              className:
                coluna.alinhamento === 'direita' ? CLASSES.celulaDireita : CLASSES.celulaEsquerda,
              texto: formatarValor(linha[coluna.chave]),
            }),
          ),
        })

        if (selecionavel) {
          tr.tabIndex = 0
          const selecionar = (): void => {
            this.aoSelecionar?.(linha)
          }
          tr.addEventListener('click', selecionar)
          tr.addEventListener('keydown', (evento) => {
            if (evento.key === 'Enter' || evento.key === ' ') {
              evento.preventDefault()
              selecionar()
            }
          })
        }
        return tr
      }),
    )
  }

  definirLinhas(linhas: readonly T[]): void {
    this.linhas = linhas
    this.renderizarCorpo()
  }

  definirCarregando(valor: boolean): void {
    this.carregando = valor
    this.renderizarCorpo()
  }
}
