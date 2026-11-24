import path from 'node:path'
import { pathToFileURL } from 'node:url'

/** Porta que decide se um evento IPC veio do frame da própria aplicação. */
export interface VerificadorOrigem {
  permitida(evento: unknown): boolean
}

/** Frame principal atual; a janela pode ser recriada no evento `activate`. */
export type ProvedorFramePrincipal = () => unknown

interface EventoIpcEstrutural {
  readonly senderFrame?: unknown
  readonly sender?: { readonly getURL?: unknown }
}

interface FrameEstrutural {
  readonly url?: unknown
  readonly isMainFrame?: unknown
}

function comoEvento(evento: unknown): EventoIpcEstrutural | null {
  if (typeof evento !== 'object' || evento === null) return null
  return evento as EventoIpcEstrutural
}

function comoFrame(valor: unknown): FrameEstrutural | null {
  if (typeof valor !== 'object' || valor === null) return null
  return valor as FrameEstrutural
}

/** Hash e query mudam conforme a rota e não fazem parte da origem confiável. */
function normalizar(valor: string): string | null {
  try {
    const url = new URL(valor)
    url.hash = ''
    url.search = ''
    return url.href
  } catch {
    return null
  }
}

/**
 * Aceita somente chamadas do frame principal da própria janela, cuja URL
 * normalizada é a mesma que a janela carrega. Em produção o arquivo exato é
 * conferido; em dev, qualquer caminho servido pela origem do Vite.
 */
export function criarVerificadorOrigem(
  urlAplicacao: string,
  framePrincipal?: ProvedorFramePrincipal,
): VerificadorOrigem {
  const alvo = new URL(urlAplicacao)
  const esperado = normalizar(alvo.href)
  if (esperado === null) throw new Error('URL da aplicacao invalida')

  const conferirUrl = (bruta: unknown): boolean => {
    if (typeof bruta !== 'string') return false
    const normalizada = normalizar(bruta)
    if (normalizada === null) return false
    if (alvo.protocol === 'file:') return normalizada === esperado
    return new URL(normalizada).origin === alvo.origin
  }

  return {
    permitida(evento: unknown): boolean {
      const candidato = comoEvento(evento)
      if (!candidato) return false

      const frame = candidato.senderFrame
      if (framePrincipal && frame !== framePrincipal()) return false

      const estrutura = comoFrame(frame)
      if (!estrutura || estrutura.isMainFrame === false) return false
      if (!conferirUrl(estrutura.url)) return false

      const remetente = candidato.sender
      if (!remetente || typeof remetente.getURL !== 'function') return false
      return conferirUrl(remetente.getURL())
    },
  }
}

/** URL que a janela principal realmente carrega, usada como origem confiável do IPC. */
export function urlAplicacao(isDev: boolean, diretorioMain: string): string {
  if (isDev) {
    return (
      process.env.ELECTRON_RENDERER_URL ??
      process.env.VITE_DEV_SERVER_URL ??
      'http://localhost:5173'
    )
  }
  return pathToFileURL(path.resolve(diretorioMain, '../renderer/index.html')).href
}
