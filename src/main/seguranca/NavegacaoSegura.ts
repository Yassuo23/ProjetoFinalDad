import type { WebContents } from 'electron'

/**
 * Bloqueia navegação para fora do próprio app e impede pop-ups.
 * O renderer não decide para onde a janela navega.
 */
export function aplicarNavegacaoSegura(conteudo: WebContents): void {
  conteudo.on('will-navigate', (evento, destino) => {
    if (destino !== conteudo.getURL()) evento.preventDefault()
  })

  conteudo.setWindowOpenHandler(() => ({ action: 'deny' }))
}
