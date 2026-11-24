import type {
  CriarCheckoutStripePayload,
  FormaPagamentoCheckout,
  TipoPagamentoCheckout,
} from '../../../shared/contratos/modelos'
import {
  AreaToast,
  Badge,
  Botao,
  Campo,
  Carregando,
  EstadoErro,
  EstadoVazio,
  Modal,
  Select,
  Tabela,
} from '../componentes'
import type { ColunaTabela, TomBadge } from '../componentes'
import { Componente, criarElemento, substituirConteudo } from '../nucleo'
import { PagamentoServico } from '../servicos'
import type { FormaPagamentoLista, PagamentoListaItem, StatusPagamentoLista } from '../servicos'

const CLASSES = {
  pagina: 'flex flex-col gap-6',
  cabecalho: 'flex flex-wrap items-start justify-between gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
  banner:
    'flex flex-wrap items-center gap-3 rounded-card border border-alerta/40 bg-alerta-suave px-4 py-3',
  bannerTexto: 'flex-1 text-sm text-alerta',
  filtros: 'grid grid-cols-1 gap-4 md:grid-cols-3',
  gradeKpis: 'grid grid-cols-1 gap-4 sm:grid-cols-3',
  cartao: 'rounded-card border border-granito/45 bg-superficie p-5 shadow-card',
  cartaoTopo: 'flex items-start justify-between gap-3',
  rotulo: 'text-xs font-semibold uppercase tracking-wider text-floresta',
  valor: 'mt-3 font-display text-3xl text-grafite',
  rodape: 'mt-2 text-xs text-floresta/70',
  lista: 'flex flex-col gap-3',
  contador: 'text-xs text-floresta/70',
  formulario: 'grid grid-cols-1 gap-4 sm:grid-cols-2',
  campoLargo: 'sm:col-span-2',
  areaCarregando: 'min-h-10 sm:col-span-2',
} as const

interface LinhaPagamento extends PagamentoListaItem {
  /** Chave da coluna de ações; não é ordenável. */
  readonly acoes: number
}

interface FormularioCheckout {
  readonly tipo: Select
  readonly forma: Select
  readonly valor: Campo
  readonly descricao: Campo
  readonly email: Campo
  readonly reservaId: Campo
  readonly enviar: Botao
  readonly cancelar: Botao
  readonly status: HTMLElement
}

const MENSAGEM_ERRO_CHECKOUT =
  'Não foi possível abrir o checkout. Verifique sua conexão e tente novamente.'

function dataISO(data: Date): string {
  const ano = data.getFullYear()
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const dia = String(data.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function periodoPadrao(): { readonly inicio: string; readonly fim: string } {
  const agora = new Date()
  return {
    inicio: dataISO(new Date(agora.getFullYear(), agora.getMonth(), 1)),
    fim: dataISO(new Date(agora.getFullYear(), agora.getMonth() + 1, 0)),
  }
}

function formatarCentavos(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function somarCentavos(itens: readonly PagamentoListaItem[]): number {
  return itens.reduce((total, item) => total + item.valorCentavos, 0)
}

function rotuloTipo(tipo: TipoPagamentoCheckout): string {
  return tipo === 'reserva' ? 'Reserva' : 'Multa'
}

function rotuloForma(forma: FormaPagamentoLista): string {
  if (forma === 'pix') {
    return 'Pix'
  }
  if (forma === 'cartao') {
    return 'Cartão'
  }
  return forma === 'dinheiro' ? 'Dinheiro' : '—'
}

function rotuloStatus(status: StatusPagamentoLista): string {
  if (status === 'pago') {
    return 'Pago'
  }
  return status === 'pendente' ? 'Pendente' : 'Estornado'
}

function tomStatus(status: StatusPagamentoLista): TomBadge {
  if (status === 'pago') {
    return 'sucesso'
  }
  return status === 'pendente' ? 'alerta' : 'erro'
}

function tipoCheckout(valor: string): TipoPagamentoCheckout | null {
  if (valor === 'reserva' || valor === 'multa') {
    return valor
  }
  return null
}

function formaCheckout(valor: string): FormaPagamentoCheckout | null {
  if (valor === 'cartao' || valor === 'pix') {
    return valor
  }
  return null
}

function statusFiltro(valor: string): StatusPagamentoLista | '' {
  if (valor === 'pago' || valor === 'pendente' || valor === 'estornado') {
    return valor
  }
  return ''
}

export class PaginaPagamentos extends Componente {
  private readonly servico = new PagamentoServico()
  private readonly toasts = new AreaToast()
  private itens: readonly PagamentoListaItem[] = []
  private dadosDeExemplo = false
  private periodoInicio: string
  private periodoFim: string
  private status: StatusPagamentoLista | '' = ''
  private areaKpis: HTMLElement | null = null
  private areaLista: HTMLElement | null = null
  private modal: Modal | null = null
  private enviando = false
  private ativa = false

  constructor() {
    super(criarElemento('section', { className: CLASSES.pagina }))
    const periodo = periodoPadrao()
    this.periodoInicio = periodo.inicio
    this.periodoFim = periodo.fim
  }

  protected aoMontar(): void {
    this.ativa = true
    this.toasts.montarFilho(document.body)
    void this.carregar()
  }

  protected aoDesmontar(): void {
    this.ativa = false
    this.modal?.fechar()
    this.modal = null
    this.toasts.destruir()
  }

  private async carregar(): Promise<void> {
    this.mostrarCarregando()
    try {
      const resultado = await this.servico.listar()
      this.itens = resultado.itens
      this.dadosDeExemplo = resultado.dadosDeExemplo
    } catch {
      this.mostrarErro()
      if (this.ativa) {
        this.toasts.exibir({
          titulo: 'Não foi possível carregar',
          mensagem: 'Não foi possível carregar os pagamentos. Tente novamente.',
          tom: 'erro',
        })
      }
      return
    }

    if (!this.ativa) {
      return
    }
    this.montarEstrutura()
  }

  private criarCabecalho(): HTMLElement {
    return criarElemento('div', {
      className: CLASSES.cabecalho,
      filhos: [
        criarElemento('div', {
          filhos: [
            criarElemento('h2', { className: CLASSES.titulo, texto: 'Pagamentos' }),
            criarElemento('p', {
              className: CLASSES.subtitulo,
              texto: 'Recebimentos de reservas e multas.',
            }),
          ],
        }),
        new Botao({
          texto: 'Pagar com Stripe',
          aoClicar: () => {
            this.abrirCheckout()
          },
        }).raiz,
      ],
    })
  }

  private criarBannerExemplo(): HTMLElement {
    return criarElemento('div', {
      className: CLASSES.banner,
      atributos: { role: 'status' },
      filhos: [
        new Badge({ texto: 'dados de exemplo', tom: 'alerta' }).raiz,
        criarElemento('p', {
          className: CLASSES.bannerTexto,
          texto:
            'Cards e tabela são ilustrativos: ainda não há canal de consulta de pagamentos. O checkout usa os dados informados no formulário.',
        }),
      ],
    })
  }

  private mostrarCarregando(): void {
    const area = criarElemento('div')
    new Carregando({ mensagem: 'Carregando pagamentos…' }).montar(area)
    substituirConteudo(this.elemento, this.criarCabecalho(), area)
  }

  private mostrarErro(): void {
    const area = criarElemento('div')
    new EstadoErro({
      mensagem: 'Não foi possível carregar os pagamentos.',
      detalhes: 'Tente novamente. Se o erro continuar, verifique a aplicação.',
      aoTentar: () => {
        void this.carregar()
      },
    }).montar(area)
    substituirConteudo(this.elemento, this.criarCabecalho(), area)
  }

  private montarEstrutura(): void {
    const filtros = criarElemento('div', {
      className: CLASSES.filtros,
      filhos: [
        new Campo({
          id: 'pagamentos-inicio',
          rotulo: 'Período · de',
          tipo: 'date',
          valorInicial: this.periodoInicio,
          aoAlterar: (valor) => {
            this.periodoInicio = valor
            this.atualizar()
          },
        }).raiz,
        new Campo({
          id: 'pagamentos-fim',
          rotulo: 'Até',
          tipo: 'date',
          valorInicial: this.periodoFim,
          aoAlterar: (valor) => {
            this.periodoFim = valor
            this.atualizar()
          },
        }).raiz,
        new Select({
          id: 'pagamentos-status',
          rotulo: 'Status',
          placeholder: 'Todos',
          valorInicial: this.status,
          opcoes: [
            { valor: 'pago', rotulo: 'Pago' },
            { valor: 'pendente', rotulo: 'Pendente' },
            { valor: 'estornado', rotulo: 'Estornado' },
          ],
          aoAlterar: (valor) => {
            this.status = statusFiltro(valor)
            this.atualizar()
          },
        }).raiz,
      ],
    })

    this.areaKpis = criarElemento('div', { className: CLASSES.gradeKpis })
    this.areaLista = criarElemento('div', { className: CLASSES.lista })
    const filhos: Array<Node> = [this.criarCabecalho()]
    if (this.dadosDeExemplo) {
      filhos.push(this.criarBannerExemplo())
    }
    filhos.push(filtros, this.areaKpis, this.areaLista)
    substituirConteudo(this.elemento, ...filhos)
    this.atualizar()
  }

  private atualizar(): void {
    if (this.areaKpis === null || this.areaLista === null) {
      return
    }

    const filtrados = this.filtrar()
    this.areaKpis.replaceChildren(this.criarKpis(filtrados))
    this.areaLista.replaceChildren(
      criarElemento('p', {
        className: CLASSES.contador,
        texto: `${filtrados.length} ${filtrados.length === 1 ? 'registro' : 'registros'}`,
      }),
    )

    if (filtrados.length === 0) {
      const vazio = criarElemento('div')
      new EstadoVazio({
        titulo: 'Nenhum pagamento no período',
        mensagem: 'Ajuste o período ou o status para ver outros registros.',
        acao: {
          texto: 'Limpar filtros',
          aoClicar: () => {
            this.limparFiltros()
          },
        },
      }).montar(vazio)
      this.areaLista.append(vazio)
      return
    }

    const linhas: readonly LinhaPagamento[] = filtrados.map((item) => ({
      ...item,
      acoes: item.reservaId,
    }))
    this.areaLista.append(
      new Tabela<LinhaPagamento>({
        colunas: this.criarColunas(),
        linhas,
        mensagemVazia: 'Nenhum pagamento no período.',
      }).raiz,
    )
  }

  private limparFiltros(): void {
    this.periodoInicio = ''
    this.periodoFim = ''
    this.status = ''
    this.montarEstrutura()
  }

  private filtrar(): readonly PagamentoListaItem[] {
    return this.itens.filter((item) => {
      const combinaPeriodo =
        (this.periodoInicio === '' || item.data >= this.periodoInicio) &&
        (this.periodoFim === '' || item.data <= this.periodoFim)
      const combinaStatus = this.status === '' || item.status === this.status
      return combinaPeriodo && combinaStatus
    })
  }

  private criarKpis(itens: readonly PagamentoListaItem[]): HTMLElement {
    const recebido = somarCentavos(itens.filter((item) => item.status === 'pago'))
    const pendente = somarCentavos(itens.filter((item) => item.status === 'pendente'))
    const multas = somarCentavos(itens.filter((item) => item.tipo === 'multa'))

    return criarElemento('div', {
      className: CLASSES.gradeKpis,
      filhos: [
        this.criarCartao('Recebido', formatarCentavos(recebido), 'Pagamentos confirmados'),
        this.criarCartao('Pendente', formatarCentavos(pendente), 'Valores aguardando baixa'),
        this.criarCartao('Multas', formatarCentavos(multas), 'Soma de multas do período'),
      ],
    })
  }

  private criarCartao(rotulo: string, valor: string, rodape: string): HTMLElement {
    return criarElemento('article', {
      className: CLASSES.cartao,
      filhos: [
        criarElemento('div', {
          className: CLASSES.cartaoTopo,
          filhos: [
            criarElemento('p', { className: CLASSES.rotulo, texto: rotulo }),
            new Badge({ texto: 'exemplo', tom: 'alerta' }).raiz,
          ],
        }),
        criarElemento('p', { className: CLASSES.valor, texto: valor }),
        criarElemento('p', { className: CLASSES.rodape, texto: rodape }),
      ],
    })
  }

  private criarColunas(): readonly ColunaTabela<LinhaPagamento>[] {
    return [
      {
        chave: 'reservaId',
        rotulo: 'Reserva',
        ordenavel: true,
        celula: (linha) => `#${linha.reservaId}`,
      },
      { chave: 'cliente', rotulo: 'Cliente', ordenavel: true },
      {
        chave: 'tipo',
        rotulo: 'Tipo',
        celula: (linha) =>
          new Badge({ texto: rotuloTipo(linha.tipo), tom: 'neutro' }).raiz,
      },
      {
        chave: 'valorCentavos',
        rotulo: 'Valor',
        ordenavel: true,
        alinhamento: 'direita',
        celula: (linha) => formatarCentavos(linha.valorCentavos),
      },
      { chave: 'forma', rotulo: 'Forma', celula: (linha) => rotuloForma(linha.forma) },
      {
        chave: 'status',
        rotulo: 'Status',
        celula: (linha) =>
          new Badge({ texto: rotuloStatus(linha.status), tom: tomStatus(linha.status) }).raiz,
      },
      { chave: 'acoes', rotulo: 'Ações', celula: (linha) => this.criarAcao(linha) },
    ]
  }

  private criarAcao(linha: LinhaPagamento): HTMLElement {
    if (linha.status === 'pendente') {
      return new Botao({
        texto: 'Pagar',
        variante: 'secundario',
        rotuloAcessivel: `Pagar ${rotuloTipo(linha.tipo).toLocaleLowerCase('pt-BR')} da reserva ${linha.reservaId} com Stripe`,
        aoClicar: () => {
          this.abrirCheckout(linha)
        },
      }).raiz
    }

    return new Botao({
      texto: 'Ver',
      variante: 'ghost',
      rotuloAcessivel: `Ver comprovante da reserva ${linha.reservaId}`,
      aoClicar: () => {
        this.toasts.exibir({
          titulo: 'Comprovante indisponível',
          mensagem: 'A consulta de comprovantes ainda não existe nos dados de exemplo.',
          tom: 'informacao',
        })
      },
    }).raiz
  }

  private abrirCheckout(item?: PagamentoListaItem): void {
    this.modal?.fechar()

    const tipo = new Select({
      id: 'checkout-tipo',
      rotulo: 'Tipo',
      valorInicial: item?.tipo ?? 'reserva',
      obrigatorio: true,
      opcoes: [
        { valor: 'reserva', rotulo: 'Reserva' },
        { valor: 'multa', rotulo: 'Multa' },
      ],
    })
    const forma = new Select({
      id: 'checkout-forma',
      rotulo: 'Forma de pagamento',
      valorInicial: 'cartao',
      obrigatorio: true,
      opcoes: [
        { valor: 'cartao', rotulo: 'Cartão' },
        { valor: 'pix', rotulo: 'Pix' },
      ],
    })
    const valor = new Campo({
      id: 'checkout-valor',
      rotulo: 'Valor (R$)',
      tipo: 'number',
      obrigatorio: true,
      placeholder: '330,00',
      valorInicial: item === undefined ? '' : (item.valorCentavos / 100).toFixed(2),
      ajuda: 'Informe em reais; a conversão para centavos é automática.',
    })
    const descricao = new Campo({
      id: 'checkout-descricao',
      rotulo: 'Descrição',
      obrigatorio: true,
      placeholder: 'Reserva #1042',
      valorInicial:
        item === undefined
          ? ''
          : `${rotuloTipo(item.tipo)} #${item.reservaId}`,
      ajuda: 'Até 200 caracteres.',
    })
    const email = new Campo({
      id: 'checkout-email',
      rotulo: 'E-mail do cliente',
      tipo: 'email',
      placeholder: 'cliente@exemplo.com',
      ajuda: 'Opcional.',
    })
    const reservaId = new Campo({
      id: 'checkout-reserva-id',
      rotulo: 'ID da reserva',
      tipo: 'number',
      placeholder: '1042',
      valorInicial: item === undefined ? '' : String(item.reservaId),
      ajuda: 'Opcional. Número inteiro positivo.',
    })
    const status = criarElemento('div', { className: CLASSES.areaCarregando })
    const cancelar = new Botao({
      texto: 'Cancelar',
      variante: 'secundario',
      aoClicar: () => {
        this.modal?.fechar()
      },
    })
    const enviar = new Botao({ texto: 'Abrir checkout', tipo: 'submit' })

    const formulario = criarElemento('form', {
      className: CLASSES.formulario,
      filhos: [
        tipo.raiz,
        forma.raiz,
        valor.raiz,
        descricao.raiz,
        email.raiz,
        reservaId.raiz,
        status,
      ],
    })
    formulario.id = 'checkout-stripe-form'
    enviar.raiz.setAttribute('form', formulario.id)

    const campos: FormularioCheckout = {
      tipo,
      forma,
      valor,
      descricao,
      email,
      reservaId,
      enviar,
      cancelar,
      status,
    }
    formulario.addEventListener('submit', (evento: SubmitEvent) => {
      evento.preventDefault()
      void this.enviarCheckout(campos)
    })

    const modal = new Modal({
      id: 'checkout-stripe',
      titulo: 'Pagar com Stripe',
      conteudo: formulario,
      rodape: [cancelar.raiz, enviar.raiz],
      aoFechar: () => {
        if (this.modal === modal) {
          this.modal = null
        }
      },
    })
    this.modal = modal
    modal.abrir()
    valor.focar()
  }

  private async enviarCheckout(form: FormularioCheckout): Promise<void> {
    if (this.enviando) {
      return
    }
    const payload = this.lerPayload(form)
    if (payload === null) {
      return
    }

    this.enviando = true
    this.alternarEnvio(form, true)
    try {
      const sessao = await this.servico.iniciarCheckout(payload)
      if (!this.ativa) {
        return
      }
      if (sessao.status === 'open') {
        this.modal?.fechar()
        this.toasts.exibir({
          titulo: 'Checkout aberto',
          mensagem: 'Conclua o pagamento na janela aberta. A baixa deste registro não é automática.',
          tom: 'sucesso',
        })
      } else if (sessao.status === 'expired') {
        this.toasts.exibir({
          titulo: 'Sessão expirada',
          mensagem: 'A sessão de checkout expirou. Abra um novo checkout para continuar.',
          tom: 'alerta',
        })
      } else {
        this.toasts.exibir({
          titulo: 'Checkout já concluído',
          mensagem: 'Esta sessão já foi concluída. Confira o status na área do cliente.',
          tom: 'informacao',
        })
      }
    } catch (erro: unknown) {
      if (this.ativa) {
        this.toasts.exibir({
          titulo: 'Não foi possível abrir o checkout',
          mensagem: erro instanceof Error ? erro.message : MENSAGEM_ERRO_CHECKOUT,
          tom: 'erro',
        })
      }
    } finally {
      this.enviando = false
      this.alternarEnvio(form, false)
    }
  }

  private lerPayload(form: FormularioCheckout): CriarCheckoutStripePayload | null {
    form.tipo.definirErro(null)
    form.forma.definirErro(null)
    form.valor.definirErro(null)
    form.descricao.definirErro(null)
    form.email.definirErro(null)
    form.reservaId.definirErro(null)
    form.status.replaceChildren()

    const tipo = tipoCheckout(form.tipo.valor())
    if (tipo === null) {
      form.tipo.definirErro('Selecione reserva ou multa.')
      return null
    }
    const forma = formaCheckout(form.forma.valor())
    if (forma === null) {
      form.forma.definirErro('Selecione cartão ou Pix.')
      return null
    }

    const valorReais = Number(form.valor.valor().trim().replace(',', '.'))
    if (!Number.isFinite(valorReais) || valorReais <= 0) {
      form.valor.definirErro('Informe um valor maior que zero.')
      return null
    }
    const valorCentavos = Math.round(valorReais * 100)
    if (!Number.isSafeInteger(valorCentavos) || valorCentavos <= 0) {
      form.valor.definirErro('Informe um valor válido em reais.')
      return null
    }

    const descricao = form.descricao.valor().trim()
    if (descricao.length === 0 || descricao.length > 200) {
      form.descricao.definirErro('Descreva a cobrança em até 200 caracteres.')
      return null
    }

    const clienteEmail = form.email.valor().trim()
    if (clienteEmail !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clienteEmail)) {
      form.email.definirErro('Informe um e-mail válido ou deixe em branco.')
      return null
    }

    let reservaId: number | undefined
    const textoReserva = form.reservaId.valor().trim()
    if (textoReserva !== '') {
      const id = Number(textoReserva)
      if (!Number.isSafeInteger(id) || id <= 0) {
        form.reservaId.definirErro('Informe um número inteiro positivo.')
        return null
      }
      reservaId = id
    }

    return {
      tipo,
      valorCentavos,
      descricao,
      ...(clienteEmail !== '' ? { clienteEmail } : {}),
      forma,
      ...(reservaId !== undefined ? { reservaId } : {}),
    }
  }

  private alternarEnvio(form: FormularioCheckout, enviando: boolean): void {
    form.tipo.definirDesabilitado(enviando)
    form.forma.definirDesabilitado(enviando)
    form.valor.definirDesabilitado(enviando)
    form.descricao.definirDesabilitado(enviando)
    form.email.definirDesabilitado(enviando)
    form.reservaId.definirDesabilitado(enviando)
    form.enviar.definirDesabilitado(enviando)
    form.cancelar.definirDesabilitado(enviando)

    if (enviando) {
      new Carregando({ mensagem: 'Abrindo checkout seguro…' }).montar(form.status)
    } else {
      form.status.replaceChildren()
    }
  }
}
