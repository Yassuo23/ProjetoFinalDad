import { pathToFileURL } from 'node:url'

/** Porta que decide se um evento IPC veio do frame da própria aplicação. */
export interface VerificadorOrigem {
  permitida(evento: unknown): boolean
}

interface EventoIpcEstrutural {
  readonly senderFrame?: { readonly url?: string; readonly isMainFrame?: boolean } | null
  readonly sender?: { getURL(): string }
}

function comoEvento(evento: unknown): EventoIpcEstrutural | null {
  if (typeof evento !== 'object' || evento === null) return null
  return evento as EventoIpcEstrutural
}

/**
 * Aceita somente chamadas cujo frame e cujo webContents apontam para a URL carregada pelo app.
 * URL do dev server é comparada por origem; em produção a comparação é do arquivo exato.
 */
export function criarVerificadorOrigem(urlAplicacao: string): VerificadorOrigem {
  const alvo = new URL(urlAplicacao)
  const origemOuArquivo = alvo.protocol === 'file:' ? alvo.href : alvo.origin

  return {
    permitida(evento: unknown): boolean {
      const candidato = comoEvento(evento)
      if (!candidato) return false

      const frame = candidato.senderFrame
      const urlFrame = frame?.url
      if (!urlFrame || frame?.isMainFrame === false) return false

      const getUrl = candidato.sender?.getURL
      if (typeof getUrl !== 'function') return false
      const urlSender = getUrl.call(candidato.sender)
      if (typeof urlSender !== 'string') return false

      const permitir = (bruta: string): boolean => {
        try {
          const url = new URL(bruta)
          return alvo.protocol === 'file:' ? url.href === origemOuArquivo : url.origin === origemOuArquivo
        } catch {
          return false
        }
      }

      return permitir(urlFrame) && permitir(urlSender)
    },
  }
}

/** URL exata que a janela principal carrega, usada como origem confiável do IPC. */
export function urlAplicacao(isDev: boolean, diretorioMain: string): string {
  if (isDev) {
    return process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:5173'
  }
  const arquivo = pathToFileURL(`${diretorioMain}/../renderer/index.html`).href
  return arquivo
}
