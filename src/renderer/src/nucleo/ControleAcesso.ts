import type { EstadoSessao, Sessao } from '../../../shared/contratos/modelos'

/**
 * Guarda de acesso do renderer — somente decisão de navegação.
 *
 * O main continua conferindo perfil em cada IPC; aqui a checagem apenas evita
 * montar uma tela protegida sem sessão e preserva a rota que o usuário pediu.
 */

export const ROTA_LOGIN = '/login'
export const ROTA_PRIMEIRA_EXECUCAO = '/primeira-execucao'
export const ROTA_ESCOLHA_CONTA = '/escolha-conta'
export const ROTA_CADASTRO_CLIENTE = '/cadastro-cliente'
export const ROTA_DASHBOARD = '/dashboard'
export const ROTA_CLIENTE_DISPONIBILIDADE = '/cliente/disponibilidade'
export const ROTA_CLIENTE_NOVA_RESERVA = '/cliente/nova-reserva'
export const ROTA_CLIENTE_MINHAS_RESERVAS = '/cliente/minhas-reservas'
export const ROTA_404 = '/404'

export const ROTAS_PUBLICAS: ReadonlySet<string> = new Set([
  ROTA_ESCOLHA_CONTA,
  ROTA_CADASTRO_CLIENTE,
  ROTA_LOGIN,
  ROTA_PRIMEIRA_EXECUCAO,
])

export const ROTAS_CLIENTE: ReadonlySet<string> = new Set([
  ROTA_CLIENTE_DISPONIBILIDADE,
  ROTA_CLIENTE_NOVA_RESERVA,
  ROTA_CLIENTE_MINHAS_RESERVAS,
])

export function ehRotaPublica(caminho: string): boolean {
  return ROTAS_PUBLICAS.has(caminho)
}

export function ehRotaCliente(caminho: string): boolean {
  return ROTAS_CLIENTE.has(caminho)
}

export type ResultadoSessaoInicial =
  | { readonly tipo: 'pronto'; readonly estado: EstadoSessao }
  | { readonly tipo: 'erro' }

export type DestinoInicial =
  | { readonly tipo: 'app'; readonly caminho: string }
  | { readonly tipo: 'login'; readonly rotaPendente: string }
  | { readonly tipo: 'escolha-conta'; readonly rotaPendente: string }
  | { readonly tipo: 'primeira-execucao' }
  | { readonly tipo: 'erro' }

/** Destino de uma sessão autenticada; nunca devolve rota de outro perfil. */
export function destinoAutenticada(sessao: Sessao, solicitado: string): string {
  if (sessao.perfil === 'Cliente') {
    return ehRotaCliente(solicitado) ? solicitado : ROTA_CLIENTE_DISPONIBILIDADE
  }
  if (ehRotaCliente(solicitado) || ehRotaPublica(solicitado)) {
    return ROTA_DASHBOARD
  }
  return solicitado
}

/** Guard síncrono usado pelo roteador antes de instanciar qualquer página. */
export function destinoGuardiao(estado: EstadoSessao, solicitado: string): string {
  switch (estado.estado) {
    case 'autenticada':
      return destinoAutenticada(estado.sessao, solicitado)
    case 'bootstrap':
      return ROTA_PRIMEIRA_EXECUCAO
    case 'anonima':
      return ehRotaPublica(solicitado) ? solicitado : ROTA_ESCOLHA_CONTA
  }
}

/** Nunca devolve uma rota pública como destino final de uma sessão autenticada. */
export function resolverDestinoInicial(
  resultado: ResultadoSessaoInicial,
  rotaSolicitada: string,
): DestinoInicial {
  if (resultado.tipo === 'erro') {
    return { tipo: 'erro' }
  }

  switch (resultado.estado.estado) {
    case 'autenticada':
      return {
        tipo: 'app',
        caminho: destinoAutenticada(resultado.estado.sessao, rotaSolicitada),
      }
    case 'bootstrap':
      return rotaSolicitada === ROTA_PRIMEIRA_EXECUCAO
        ? { tipo: 'app', caminho: ROTA_PRIMEIRA_EXECUCAO }
        : { tipo: 'primeira-execucao' }
    case 'anonima':
      if (ehRotaPublica(rotaSolicitada)) {
        return { tipo: 'app', caminho: rotaSolicitada }
      }
      return rotaSolicitada === ROTA_404
        ? { tipo: 'app', caminho: ROTA_ESCOLHA_CONTA }
        : { tipo: 'escolha-conta', rotaPendente: rotaSolicitada }
  }
}

let rotaPendente: string | null = null

export function guardarRotaPendente(caminho: string): void {
  if (!ehRotaPublica(caminho) && caminho !== ROTA_404) {
    rotaPendente = caminho
  }
}

export function consumirRotaPendente(): string {
  const destino = rotaPendente ?? ROTA_DASHBOARD
  rotaPendente = null
  return destino
}

export function limparRotaPendente(): void {
  rotaPendente = null
}
