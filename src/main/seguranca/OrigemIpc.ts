/** Estrutura mínima do frame que recebeu a chamada IPC (sem importar Electron). */
export interface QuadroIpc {
  readonly url: string
  readonly parent: QuadroIpc | null
}

export interface EventoIpc {
  readonly senderFrame: QuadroIpc | null
}

function eQuadro(valor: unknown): valor is QuadroIpc {
  if (typeof valor !== 'object' || valor === null) return false
  const quadro = valor as { url?: unknown; parent?: unknown }
  return typeof quadro.url === 'string' && quadro.parent === null
}

function eEvento(valor: unknown): valor is EventoIpc {
  if (typeof valor !== 'object' || valor === null) return false
  return 'senderFrame' in valor
}

/** Compara origem e caminho, ignorando query/hash do HMR. */
export function chaveUrl(valor: string): string | null {
  try {
    const url = new URL(valor)
    if (url.protocol === 'file:') return `file:${url.pathname}`
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      return `${url.origin}${url.pathname}`
    }
    return null
  } catch {
    return null
  }
}

/**
 * Só aceita chamadas do frame principal da própria janela do app.
 * Um subframe (iframe) ou outra origem nunca pode invocar handlers.
 */
export function origemIpcConfiavel(evento: unknown, urlsPermitidas: readonly string[]): boolean {
  if (!eEvento(evento)) return false
  if (!eQuadro(evento.senderFrame)) return false

  const chave = chaveUrl(evento.senderFrame.url)
  if (!chave) return false

  return urlsPermitidas.some((permitida) => chaveUrl(permitida) === chave)
}
