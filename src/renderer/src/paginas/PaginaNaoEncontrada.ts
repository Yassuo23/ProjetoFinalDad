import { EstadoVazio } from '../componentes'
import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  pagina: 'flex max-w-2xl flex-col gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
} as const

export class PaginaNaoEncontrada extends Componente {
  constructor() {
    const vazio = new EstadoVazio({
      titulo: 'Página não encontrada',
      mensagem: 'Este endereço não existe. Volte ao Dashboard para continuar.',
      acao: {
        texto: 'Voltar ao Dashboard',
        aoClicar: () => {
          window.location.hash = '#/dashboard'
        },
      },
    })

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [vazio.raiz],
      }),
    )
  }
}
