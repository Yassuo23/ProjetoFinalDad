import { chaveUrl } from './OrigemIpc'

export interface EventoNavegacao {
  preventDefault(): void
}

export interface NavegacaoWebContents {
  aoNavegar(ouvinte: (evento: EventoNavegacao, url: string) => void): void
  aoNavegarQuadro(ouvinte: (evento: EventoNavegacao, url: string) => void): void
  aoAbrirJanela(negar: () => { action: 'deny' }): void
}

/** Só a URL da própria janela pode ser navegada; links externos usam openExternal. */
export function destinoPermitido(destino: string, urlApp: string): boolean {
  const alvo = chaveUrl(destino)
  const permitida = chaveUrl(urlApp)
  return alvo !== null && permitida !== null && alvo === permitida
}

export function protegerNavegacao(webContents: NavegacaoWebContents, urlApp: string): void {
  webContents.aoNavegar((evento, destino) => {
    if (!destinoPermitido(destino, urlApp)) evento.preventDefault()
  })

  webContents.aoNavegarQuadro((evento, destino) => {
    if (!destinoPermitido(destino, urlApp)) evento.preventDefault()
  })

  webContents.aoAbrirJanela(() => ({ action: 'deny' }))
}
