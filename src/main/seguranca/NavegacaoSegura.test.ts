import { describe, expect, it, vi } from 'vitest'
import {
  destinoPermitido,
  protegerNavegacao,
  type EventoNavegacao,
  type NavegacaoWebContents,
} from './NavegacaoSegura'

const URL_APP = 'file:///C:/Zenite/dist/renderer/index.html'

class WebContentsFalso implements NavegacaoWebContents {
  private navegacao: ((evento: EventoNavegacao, url: string) => void) | null = null
  private quadro: ((evento: EventoNavegacao, url: string) => void) | null = null

  aoNavegar(ouvinte: (evento: EventoNavegacao, url: string) => void): void {
    this.navegacao = ouvinte
  }

  aoNavegarQuadro(ouvinte: (evento: EventoNavegacao, url: string) => void): void {
    this.quadro = ouvinte
  }

  aoAbrirJanela = vi.fn((_negar: () => { action: 'deny' }): void => undefined)

  navegar(url: string): boolean {
    let impedido = false
    const evento: EventoNavegacao = { preventDefault: () => (impedido = true) }
    this.navegacao?.(evento, url)
    return impedido
  }

  navegarQuadro(url: string): boolean {
    let impedido = false
    const evento: EventoNavegacao = { preventDefault: () => (impedido = true) }
    this.quadro?.(evento, url)
    return impedido
  }
}

describe('NavegacaoSegura', () => {
  it('aceita somente a URL da propria janela', () => {
    expect(destinoPermitido(URL_APP, URL_APP)).toBe(true)
    expect(destinoPermitido('https://electronjs.org', URL_APP)).toBe(false)
  })

  it('bloqueia navegacao principal e de quadro para destino externo', () => {
    const webContents = new WebContentsFalso()
    protegerNavegacao(webContents, URL_APP)

    expect(webContents.navegar(URL_APP)).toBe(false)
    expect(webContents.navegar('https://google.com')).toBe(true)
    expect(webContents.navegarQuadro('https://google.com')).toBe(true)
  })

  it('nega abertura de janela por padrao', () => {
    const webContents = new WebContentsFalso()
    protegerNavegacao(webContents, URL_APP)

    expect(webContents.aoAbrirJanela).toHaveBeenCalledTimes(1)
    const negar = webContents.aoAbrirJanela.mock.calls[0]?.[0]
    expect(negar?.()).toEqual({ action: 'deny' })
  })
})
