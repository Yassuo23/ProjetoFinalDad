/**
 * Sinaliza a expiração da sessão sem engolir o erro original.
 *
 * O main serializa `ErroDeDominio` como `Error` cuja `message` é o código
 * estável (`NAO_AUTENTICADO`). A leitura é feita com type guard, sem `any` e
 * sem inspecionar texto de driver. Quem decide navegar é `src/renderer/src/main.ts`.
 */
export const EVENTO_SESSAO_EXPIRADA = 'zenite:sessao-expirada'

export function sessaoExpirada(erro: unknown): boolean {
  return erro instanceof Error && erro.message === 'NAO_AUTENTICADO'
}

export function sinalizarSessaoExpirada(): void {
  window.dispatchEvent(new Event(EVENTO_SESSAO_EXPIRADA))
}

export function vigiarSessao<T>(promessa: Promise<T>): Promise<T> {
  return promessa.catch((erro: unknown) => {
    if (sessaoExpirada(erro)) {
      sinalizarSessaoExpirada()
    }
    throw erro
  })
}
