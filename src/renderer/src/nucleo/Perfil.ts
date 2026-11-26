import { observarSessao, sessaoAtiva } from './Sessao'

/**
 * Perfil derivado da sessão real do main.
 *
 * Não existe alternador de demonstração: o renderer não decide perfil,
 * apenas reflete `Sessao.perfil`. Sem sessão, adota o perfil menos
 * privilegiado — nunca transforma um Cliente em atendente.
 */
export type Perfil = 'cliente' | 'atendente' | 'administrador'

export const ROTULOS_PERFIL: Readonly<Record<Perfil, string>> = {
  cliente: 'Cliente',
  atendente: 'Atendente de balcão',
  administrador: 'Administrador',
}

type OuvintePerfil = (perfil: Perfil) => void

export function perfilAtivo(): Perfil {
  const perfil = sessaoAtiva()?.perfil
  if (perfil === 'Administrador') {
    return 'administrador'
  }
  if (perfil === 'Atendente') {
    return 'atendente'
  }
  return 'cliente'
}

export function ehAdministrador(): boolean {
  return sessaoAtiva()?.perfil === 'Administrador'
}

export function ehCliente(): boolean {
  return sessaoAtiva()?.perfil === 'Cliente'
}

/** Cliente sem vínculo é tratado como sem acesso a dados de reserva. */
export function clienteVinculado(): boolean {
  return idClienteVinculado() !== null
}

/** Devolve somente o `clienteId` informado pelo main na sessão. */
export function idClienteVinculado(): number | null {
  const sessao = sessaoAtiva()
  if (sessao === null || sessao.perfil !== 'Cliente') {
    return null
  }
  const id = sessao.clienteId
  return typeof id === 'number' && Number.isInteger(id) && id > 0 ? id : null
}

export function observarPerfil(ouvinte: OuvintePerfil): () => void {
  return observarSessao(() => {
    ouvinte(perfilAtivo())
  })
}
