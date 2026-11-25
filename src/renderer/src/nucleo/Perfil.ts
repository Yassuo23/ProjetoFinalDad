/**
 * Perfil de demonstração do renderer. Não há contrato `auth:*`: o estado vive
 * somente em memória e some a cada recarregamento da aplicação.
 */
export type Perfil = 'atendente' | 'administrador'

export const ROTULOS_PERFIL: Readonly<Record<Perfil, string>> = {
  atendente: 'Atendente de balcão',
  administrador: 'Administrador',
}

type OuvintePerfil = (perfil: Perfil) => void

let atual: Perfil = 'atendente'
const ouvintes = new Set<OuvintePerfil>()

export function perfilAtivo(): Perfil {
  return atual
}

export function ehAdministrador(): boolean {
  return atual === 'administrador'
}

export function definirPerfil(perfil: Perfil): void {
  if (perfil === atual) {
    return
  }
  atual = perfil
  for (const ouvinte of [...ouvintes]) {
    ouvinte(atual)
  }
}

export function observarPerfil(ouvinte: OuvintePerfil): () => void {
  ouvintes.add(ouvinte)
  return () => {
    ouvintes.delete(ouvinte)
  }
}
