import { Botao } from '../componentes'
import { LogoZenite } from '../layout/LogoZenite'
import { Componente, criarElemento } from '../nucleo'

export interface OpcoesPaginaEscolhaConta {
  /** Vai para o fluxo administrativo atual (login/primeira execução). */
  readonly aoAdministrador: () => void
  /** Vai para o auto-cadastro público de cliente. */
  readonly aoCliente: () => void
}

/** Classes literais — nenhuma interpolação e nenhum estilo inline. */
const CLASSES = {
  pagina: 'flex min-h-full items-center justify-center bg-pedra px-4 py-8 sm:px-6',
  cartao:
    'w-full max-w-3xl rounded-card border border-granito/45 bg-superficie p-6 shadow-card sm:p-10',
  marca: 'mb-8 flex justify-center',
  titulo: 'font-display text-2xl text-floresta sm:text-3xl',
  subtitulo: 'mt-2 text-sm text-floresta/70',
  opcoes: 'mt-8 grid grid-cols-1 gap-4 md:grid-cols-2',
  areaBotao: 'flex',
  nota: 'mt-6 text-xs text-floresta/70',
} as const

export class PaginaEscolhaConta extends Componente {
  private readonly botaoCliente: Botao

  constructor(opcoes: OpcoesPaginaEscolhaConta) {
    const botaoAdministrador = new Botao({
      id: 'escolha-administrador',
      texto: 'Sou dono/atendente da loja',
      variante: 'secundario',
      aoClicar: opcoes.aoAdministrador,
    })
    const botaoCliente = new Botao({
      id: 'escolha-cliente',
      texto: 'Quero alugar equipamentos',
      variante: 'primario',
      aoClicar: opcoes.aoCliente,
    })

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        atributos: { 'aria-label': 'Escolha o tipo de conta' },
        filhos: [
          criarElemento('div', {
            className: CLASSES.cartao,
            filhos: [
              criarElemento('div', {
                className: CLASSES.marca,
                filhos: [new LogoZenite({ variante: 'completa', fundo: 'claro' }).raiz],
              }),
              criarElemento('h1', {
                className: CLASSES.titulo,
                texto: 'Como você quer usar o Zênite?',
              }),
              criarElemento('p', {
                className: CLASSES.subtitulo,
                texto: 'Escolha uma opção para continuar. Você pode voltar depois.',
              }),
              criarElemento('div', {
                className: CLASSES.opcoes,
                filhos: [
                  criarElemento('div', {
                    className: CLASSES.areaBotao,
                    filhos: [botaoAdministrador.raiz],
                  }),
                  criarElemento('div', {
                    className: CLASSES.areaBotao,
                    filhos: [botaoCliente.raiz],
                  }),
                ],
              }),
              criarElemento('p', {
                className: CLASSES.nota,
                texto:
                  'Na primeira execução, a loja precisa criar a conta de administrador antes de liberar os cadastros de cliente.',
              }),
            ],
          }),
        ],
      }),
    )

    this.botaoCliente = botaoCliente
  }

  protected aoMontar(): void {
    this.botaoCliente.focar()
  }
}
