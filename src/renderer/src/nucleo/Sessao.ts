import type { Sessao } from '../../../shared/contratos/modelos'

/**
 * Sessão do renderer: somente memória.
 *
 * O processo principal é a fonte da verdade — aqui não há token, localStorage,
 * cookie nem gravacao em disco. Perfil e nome vêm de `Sessao`, devolvida por
 * `auth:entrar` / `auth:bootstrap` / `auth:sessao-atual`.
 */

type OuvinteSessao = (sessao: Sessao | null) => void

let atual: Sessao | null = null
const ouvintes = new Set<OuvinteSessao>()

export function sessaoAtiva(): Sessao | null {
  return atual
}

export function definirSessao(sessao: Sessao | null): void {
  atual = sessao
  for (const ouvinte of [...ouvintes]) {
    ouvinte(atual)
  }
}

export function limparSessao(): void {
  definirSessao(null)
}

export function observarSessao(ouvinte: OuvinteSessao): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
