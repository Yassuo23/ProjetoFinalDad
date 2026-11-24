import { describe, expect, it, vi } from 'vitest'
import type { WebContents } from 'electron'
import { aplicarNavegacaoSegura } from './NavegacaoSegura'

type Ouvinte = (evento: { preventDefault(): void }, destino: string) => void

class ConteudoFalso {
  readonly url = 'http://localhost:5173/'
  readonly preventDefault = vi.fn()
  private ouvinte: Ouvinte | null = null
  private manipulador: (() => { action: 'deny' }) | null = null

  on(_evento: string, ouvinte: Ouvinte): void {
    this.ouvinte = ouvinte
  }

  setWindowOpenHandler(manipulador: () => { action: 'deny' }): void {
    this.manipulador = manipulador
  }

  getURL(): string {
    return this.url
  }

  navegar(destino: string): void {
    this.ouvinte?.({ preventDefault: this.preventDefault }, destino)
  }

  abrirJanela(): { action: 'deny' } | null {
    return this.manipulador?.() ?? null
  }
}

describe('aplicarNavegacaoSegura', () => {
  it('bloqueia destinos diferentes da URL atual', () => {
    const conteudo = new ConteudoFalso()
    aplicarNavegacaoSegura(conteudo as unknown as WebContents)

    conteudo.navegar('file:///C:/Windows/System32/calc.exe')
    conteudo.navegar(conteudo.url)

    expect(conteudo.preventDefault).toHaveBeenCalledTimes(1)
  })

  it('nega pop-ups', () => {
    const conteudo = new ConteudoFalso()
    aplicarNavegacaoSegura(conteudo as unknown as WebContents)

    expect(conteudo.abrirJanela()).toEqual({ action: 'deny' })
  })
})
