/** Peças compartilhadas por Campo e Select (rótulo, ajuda e erro). */
import { criarElemento } from '../nucleo'

export const CLASSE_ROTULO =
  'mb-1.5 block text-xs font-semibold uppercase tracking-wider text-floresta'
export const CLASSE_AJUDA = 'mt-1.5 text-xs text-floresta/70'
export const CLASSE_MENSAGEM_ERRO = 'mt-1.5 text-xs text-erro'

export type ControleCampo = HTMLInputElement | HTMLSelectElement

export function criarRotulo(id: string, texto: string, obrigatorio: boolean): HTMLLabelElement {
  const filhos: Array<Node | string> = [texto]
  if (obrigatorio) {
    filhos.push(
      criarElemento('span', {
        className: 'ml-1 text-erro',
        atributos: { 'aria-hidden': 'true' },
        texto: '*',
      }),
    )
  }
  return criarElemento('label', {
    className: CLASSE_ROTULO,
    atributos: { for: id },
    filhos,
  })
}

export function criarAjuda(id: string, texto: string | undefined): HTMLParagraphElement {
  const ajuda = criarElemento('p', { className: CLASSE_AJUDA, texto: texto ?? '' })
  ajuda.id = id
  ajuda.hidden = texto === undefined
  return ajuda
}

export function criarMensagemErro(id: string): HTMLParagraphElement {
  const mensagem = criarElemento('p', {
    className: CLASSE_MENSAGEM_ERRO,
    atributos: { role: 'alert' },
  })
  mensagem.id = id
  mensagem.hidden = true
  return mensagem
}

/** Mantém aria-describedby/aria-invalid coerentes com ajuda e erro visíveis. */
export function sincronizarDescricao(
  controle: ControleCampo,
  ajuda: HTMLParagraphElement,
  mensagemErro: HTMLParagraphElement,
): void {
  const ids: string[] = []
  if (!ajuda.hidden) {
    ids.push(ajuda.id)
  }
  if (!mensagemErro.hidden) {
    ids.push(mensagemErro.id)
  }
  if (ids.length > 0) {
    controle.setAttribute('aria-describedby', ids.join(' '))
  } else {
    controle.removeAttribute('aria-describedby')
  }

  if (mensagemErro.hidden) {
    controle.removeAttribute('aria-invalid')
  } else {
    controle.setAttribute('aria-invalid', 'true')
  }
}
