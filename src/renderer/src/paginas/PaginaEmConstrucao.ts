import { Badge, EstadoVazio } from '../componentes'
import { Componente, criarElemento } from '../nucleo'

const CLASSES = {
  pagina: 'flex max-w-2xl flex-col gap-4',
  titulo: 'font-display text-2xl font-semibold text-floresta',
  subtitulo: 'mt-1 text-sm text-floresta/70',
} as const

const ICONE = 'M12 8v4M12 16h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'

/**
 * Placeholder honesto para rotas do mapa que ainda não têm contrato IPC.
 * Cada rota recebe sua própria instância, com título e dependências.
 */
export class PaginaEmConstrucao extends Componente {
  constructor(titulo: string, dependencia: string) {
    const vazio = new EstadoVazio({
      titulo: 'Tela em construção',
      mensagem: 'Esta tela depende de canais que ainda não existem no contrato IPC.',
      icone: ICONE,
    })
    vazio.raiz.append(new Badge({ texto: dependencia, tom: 'alerta' }).raiz)

    super(
      criarElemento('section', {
        className: CLASSES.pagina,
        filhos: [
          criarElemento('div', {
            filhos: [
              criarElemento('h2', { className: CLASSES.titulo, texto: titulo }),
              criarElemento('p', {
                className: CLASSES.subtitulo,
                texto: 'Telas planejadas em docs/telas.md.',
              }),
            ],
          }),
          vazio.raiz,
        ],
      }),
    )
  }
}
