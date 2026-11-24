import type { StatusPagamento, StatusReserva } from '../../../shared/contratos/modelos'
import { criarElemento } from '../nucleo'

/** Strings literais completas: o Tailwind v4 as enxerga no código-fonte. */
export const CLASSES = {
  cartao: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  tituloSecao: 'font-display text-lg text-floresta',
  texto: 'text-sm text-grafite',
  muted: 'text-sm text-floresta/70',
  erro: 'rounded-control border border-erro/40 bg-erro-suave px-4 py-3 text-sm text-erro',
  aviso: 'rounded-control border border-sucesso/40 bg-sucesso-suave px-4 py-3 text-sm text-sucesso',
  formulario: 'grid grid-cols-1 gap-4 md:grid-cols-2',
  formularioSimples: 'flex flex-col gap-4',
  larguraTotal: 'md:col-span-2',
  rotulo: 'flex flex-col gap-1.5',
  textoRotulo: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  controle:
    'w-full rounded-control border border-granito/45 bg-superficie px-3 py-2 text-sm text-grafite placeholder:text-floresta/70 transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra disabled:text-floresta/60 read-only:bg-pedra/60 read-only:text-floresta/70',
  areaTexto:
    'w-full min-h-20 resize-y rounded-control border border-granito/45 bg-superficie px-3 py-2 text-sm text-grafite placeholder:text-floresta/70 transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta',
  selecao:
    'w-full appearance-none rounded-control border border-granito/45 bg-superficie px-3 py-2 pr-9 text-sm text-grafite transition-colors hover:border-floresta/60 focus-visible:border-floresta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:bg-pedra',
  botao:
    'inline-flex items-center justify-center rounded-control bg-lima px-4 py-2.5 text-sm font-semibold text-grafite transition-colors hover:bg-geleira focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:opacity-50',
  botaoSecundario:
    'inline-flex items-center justify-center rounded-control border border-granito/45 bg-superficie px-4 py-2.5 text-sm font-semibold text-floresta transition-colors hover:bg-pedra focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-floresta disabled:cursor-not-allowed disabled:opacity-50',
  botaoPerigo:
    'inline-flex items-center justify-center rounded-control bg-erro px-4 py-2.5 text-sm font-semibold text-branco transition-colors hover:bg-erro/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-erro disabled:cursor-not-allowed disabled:opacity-50',
  botaoPequeno: 'px-3 py-1.5 text-xs',
  acoes: 'flex flex-wrap items-center gap-3',
  acoesItem: 'mt-3 flex flex-wrap gap-2',
  lista: 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3',
  item: 'flex flex-col gap-2 rounded-card border border-granito/45 bg-superficie p-4 shadow-card',
  itemTitulo: 'font-display text-base text-floresta',
  resumo: 'flex flex-col gap-2 rounded-card border border-granito/45 bg-pedra/40 p-4',
  resumoTitulo: 'font-display text-base text-floresta',
  resumoLista: 'grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm',
  resumoRotulo: 'text-floresta/70',
  resumoValor: 'text-right font-semibold text-grafite',
  previsaoLista: 'mt-3 flex flex-col gap-2',
  previsaoItem:
    'rounded-control border border-granito/30 bg-pedra/40 px-3 py-2 text-sm text-grafite',
  disponivel:
    'rounded-control border border-sucesso/40 bg-sucesso-suave px-4 py-3 text-sm font-semibold text-sucesso',
  indisponivel:
    'rounded-control border border-erro/40 bg-erro-suave px-4 py-3 text-sm font-semibold text-erro',
} as const

const STATUS_RESERVA: Readonly<Record<StatusReserva, string>> = {
  pendente: 'text-sm font-semibold text-alerta',
  confirmada: 'text-sm font-semibold text-sucesso',
  cancelada: 'text-sm font-semibold text-erro',
  concluida: 'text-sm font-semibold text-floresta',
}

const STATUS_PAGAMENTO: Readonly<Record<StatusPagamento, string>> = {
  pendente: 'text-sm font-semibold text-alerta',
  pago: 'text-sm font-semibold text-sucesso',
  estornado: 'text-sm font-semibold text-erro',
}

export function classeStatusReserva(status: StatusReserva): string {
  return STATUS_RESERVA[status]
}

export function classeStatusPagamento(status: StatusPagamento): string {
  return STATUS_PAGAMENTO[status]
}

export interface OpcoesEntrada {
  readonly nome: string
  readonly id?: string
  readonly tipo?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'datetime-local'
  readonly placeholder?: string
  readonly maxlength?: string
  readonly min?: string
  readonly step?: string
  readonly obrigatorio?: boolean
  readonly somenteLeitura?: boolean
}

export function criarEntrada(opcoes: OpcoesEntrada): HTMLInputElement {
  const atributos: Record<string, string> = { type: opcoes.tipo ?? 'text' }
  if (opcoes.placeholder !== undefined) atributos.placeholder = opcoes.placeholder
  if (opcoes.maxlength !== undefined) atributos.maxlength = opcoes.maxlength
  if (opcoes.min !== undefined) atributos.min = opcoes.min
  if (opcoes.step !== undefined) atributos.step = opcoes.step
  if (opcoes.obrigatorio === true) {
    atributos.required = ''
    atributos['aria-required'] = 'true'
  }
  if (opcoes.somenteLeitura === true) atributos.readonly = ''

  const entrada = criarElemento('input', { className: CLASSES.controle, atributos })
  entrada.name = opcoes.nome
  entrada.id = opcoes.id ?? `campo-${opcoes.nome}`
  return entrada
}

export interface OpcoesSelecao {
  readonly nome: string
  readonly id?: string
  readonly obrigatorio?: boolean
}

export function criarSelecao(opcoes: OpcoesSelecao): HTMLSelectElement {
  const atributos: Record<string, string> = {}
  if (opcoes.obrigatorio === true) {
    atributos.required = ''
    atributos['aria-required'] = 'true'
  }
  const selecao = criarElemento('select', { className: CLASSES.selecao, atributos })
  selecao.name = opcoes.nome
  selecao.id = opcoes.id ?? `campo-${opcoes.nome}`
  return selecao
}

export function criarAreaTexto(nome: string, maxlength?: string): HTMLTextAreaElement {
  const atributos: Record<string, string> = {}
  if (maxlength !== undefined) atributos.maxlength = maxlength
  const area = criarElemento('textarea', { className: CLASSES.areaTexto, atributos })
  area.name = nome
  area.id = `campo-${nome}`
  return area
}

export function rotular(rotulo: string, controle: HTMLElement): HTMLLabelElement {
  return criarElemento('label', {
    className: CLASSES.rotulo,
    filhos: [criarElemento('span', { className: CLASSES.textoRotulo, texto: rotulo }), controle],
  })
}

export interface OpcoesBotaoFuncional {
  readonly variante?: 'primario' | 'secundario' | 'perigo'
  readonly tipo?: 'button' | 'submit'
  readonly acao?: string
  readonly desabilitado?: boolean
  readonly pequeno?: boolean
}

export function criarBotao(texto: string, opcoes: OpcoesBotaoFuncional = {}): HTMLButtonElement {
  const variante = opcoes.variante ?? 'primario'
  const classeBase =
    variante === 'perigo'
      ? CLASSES.botaoPerigo
      : variante === 'secundario'
        ? CLASSES.botaoSecundario
        : CLASSES.botao
  const botao = criarElemento('button', {
    className: opcoes.pequeno === true ? `${classeBase} ${CLASSES.botaoPequeno}` : classeBase,
    atributos: { type: opcoes.tipo ?? 'button' },
    texto,
  })
  if (opcoes.acao !== undefined) botao.dataset.acao = opcoes.acao
  if (opcoes.desabilitado === true) botao.disabled = true
  return botao
}

export function criarOpcao(valor: string, rotulo: string): HTMLOptionElement {
  return criarElemento('option', {
    texto: rotulo,
    atributos: { value: valor },
  })
}
