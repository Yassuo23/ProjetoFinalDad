/** Atalhos globais das telas (docs/telas.md §1.2), sem conflito com o roteador. */
export interface AcoesAtalhos {
  readonly aoNovo: () => void
  readonly aoBuscar: () => void
  readonly aoRecarregar: () => void
  readonly aoEditar: () => void
  readonly aoConfirmar: () => void
  readonly aoCancelar: () => void
  readonly aoConfirmarRapido?: () => void
  readonly emCampo: () => boolean
  readonly modalAberto: () => boolean
}

export function registrarAtalhos(acoes: AcoesAtalhos): () => void {
  const aoTeclado = (evento: KeyboardEvent): void => {
    const comModal = acoes.modalAberto()
    if (evento.key === 'Escape') {
      if (!comModal) {
        evento.preventDefault()
        acoes.aoCancelar()
      }
      return
    }
    if (
      (evento.ctrlKey || evento.metaKey) &&
      evento.key === 'Enter' &&
      acoes.aoConfirmarRapido !== undefined
    ) {
      evento.preventDefault()
      acoes.aoConfirmarRapido()
      return
    }
    if (comModal) {
      return
    }

    const alvo = evento.target
    const emCampo =
      acoes.emCampo() || (alvo instanceof HTMLElement && alvo.matches('input, select, textarea'))

    if (evento.ctrlKey || evento.metaKey) {
      const chave = evento.key.toLowerCase()
      if (chave === 'n') {
        evento.preventDefault()
        acoes.aoNovo()
      } else if (chave === 'k') {
        evento.preventDefault()
        acoes.aoBuscar()
      }
      return
    }

    if (evento.altKey) {
      return
    }

    if (evento.key === 'F5') {
      evento.preventDefault()
      acoes.aoRecarregar()
      return
    }
    if (evento.key === 'F2' && !emCampo) {
      evento.preventDefault()
      acoes.aoEditar()
      return
    }
    if (evento.key === 'Enter' && !emCampo) {
      evento.preventDefault()
      acoes.aoConfirmar()
    }
  }

  document.addEventListener('keydown', aoTeclado)
  return () => {
    document.removeEventListener('keydown', aoTeclado)
  }
}
