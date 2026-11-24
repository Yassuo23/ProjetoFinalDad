import type {
  CriarCheckoutStripePayload,
  FormaPagamentoCheckout,
  SessaoCheckoutStripe,
  TipoPagamentoCheckout,
} from '../../../shared/contratos/modelos'

/** Tipos do contrato reexportados para quem consome apenas a camada de serviços. */
export type {
  CriarCheckoutStripePayload,
  FormaPagamentoCheckout,
  SessaoCheckoutStripe,
  TipoPagamentoCheckout,
}

export type StatusPagamentoLista = 'pago' | 'pendente' | 'estornado'
export type FormaPagamentoLista = 'pix' | 'cartao' | 'dinheiro' | null

/** Linha da tela: ainda não existe modelo de pagamento no contrato compartilhado. */
export interface PagamentoListaItem {
  readonly reservaId: number
  readonly cliente: string
  readonly tipo: TipoPagamentoCheckout
  readonly valorCentavos: number
  readonly forma: FormaPagamentoLista
  readonly status: StatusPagamentoLista
  /** ISO `AAAA-MM-DD`, usada pelo filtro de período. */
  readonly data: string
}

export interface ResultadoPagamentos {
  readonly itens: readonly PagamentoListaItem[]
  readonly dadosDeExemplo: boolean
}

const ERRO_CHECKOUT =
  'Não foi possível abrir o checkout com Stripe. Verifique sua conexão e tente novamente.'
const ERRO_ABERTURA =
  'O checkout foi criado, mas a janela de pagamento não abriu. Tente novamente; se o problema continuar, contate o administrador.'

function diaDoMes(dia: number): string {
  const agora = new Date()
  const ultimoDia = new Date(agora.getFullYear(), agora.getMonth() + 1, 0).getDate()
  const data = new Date(agora.getFullYear(), agora.getMonth(), Math.min(dia, ultimoDia))
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const diaFormatado = String(data.getDate()).padStart(2, '0')
  return `${data.getFullYear()}-${mes}-${diaFormatado}`
}

/** Sem canal de consulta no contrato: conjunto ilustrativo, marcado como exemplo na tela. */
const PAGAMENTOS_EXEMPLO: readonly PagamentoListaItem[] = [
  {
    reservaId: 1042,
    cliente: 'Ana Souza',
    tipo: 'reserva',
    valorCentavos: 33000,
    forma: 'pix',
    status: 'pago',
    data: diaDoMes(3),
  },
  {
    reservaId: 1051,
    cliente: 'Carlos Lima',
    tipo: 'multa',
    valorCentavos: 2500,
    forma: null,
    status: 'pendente',
    data: diaDoMes(12),
  },
  {
    reservaId: 1058,
    cliente: 'Joana Ribeiro',
    tipo: 'reserva',
    valorCentavos: 18500,
    forma: 'cartao',
    status: 'pendente',
    data: diaDoMes(18),
  },
  {
    reservaId: 1060,
    cliente: 'Marcos Alves',
    tipo: 'reserva',
    valorCentavos: 48000,
    forma: 'cartao',
    status: 'pago',
    data: diaDoMes(21),
  },
  {
    reservaId: 1064,
    cliente: 'Paula Mendes',
    tipo: 'multa',
    valorCentavos: 7500,
    forma: null,
    status: 'estornado',
    data: diaDoMes(25),
  },
]

export class PagamentoServico {
  /** Consulta ilustrativa até existir um canal de listagem de pagamentos. */
  async listar(): Promise<ResultadoPagamentos> {
    return { itens: PAGAMENTOS_EXEMPLO, dadosDeExemplo: true }
  }

  /**
   * Cria o checkout pela ponte tipada e abre somente sessões `open`.
   * Erros são normalizados em mensagens curtas, sem stack, URL ou segredo.
   */
  async iniciarCheckout(payload: CriarCheckoutStripePayload): Promise<SessaoCheckoutStripe> {
    let sessao: SessaoCheckoutStripe
    try {
      sessao = await window.electronAPI.stripe.criarCheckout(payload)
    } catch {
      throw new Error(ERRO_CHECKOUT)
    }

    if (sessao.status === 'open') {
      try {
        await window.electronAPI.abrirExterno(sessao.url)
      } catch {
        throw new Error(ERRO_ABERTURA)
      }
    }

    return sessao
  }
}
