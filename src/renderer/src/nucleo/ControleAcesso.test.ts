import { beforeEach, describe, expect, it } from 'vitest'
import {
  ROTA_CADASTRO_CLIENTE,
  ROTA_CLIENTE_DISPONIBILIDADE,
  ROTA_CLIENTE_MINHAS_RESERVAS,
  ROTA_DASHBOARD,
  ROTA_ESCOLHA_CONTA,
  ROTA_LOGIN,
  ROTA_PRIMEIRA_EXECUCAO,
  consumirRotaPendente,
  destinoGuardiao,
  ehRotaPublica,
  guardarRotaPendente,
  limparRotaPendente,
  resolverDestinoInicial,
} from './ControleAcesso'

const SESSAO_ADMIN = {
  usuarioId: 1,
  nome: 'Ana',
  login: 'ana',
  perfil: 'Administrador',
} as const

const SESSAO_CLIENTE = {
  usuarioId: 2,
  nome: 'João',
  login: 'joao',
  perfil: 'Cliente',
  clienteId: 42,
} as const

describe('ControleAcesso', () => {
  beforeEach(() => {
    limparRotaPendente()
  })

  it('mantém rotas públicas fora do guard', () => {
    expect(ehRotaPublica(ROTA_ESCOLHA_CONTA)).toBe(true)
    expect(ehRotaPublica(ROTA_CADASTRO_CLIENTE)).toBe(true)
    expect(ehRotaPublica(ROTA_LOGIN)).toBe(true)
    expect(ehRotaPublica(ROTA_PRIMEIRA_EXECUCAO)).toBe(true)
    expect(ehRotaPublica('/clientes')).toBe(false)
  })

  it('autenticada vai à rota pedida, mas nunca a uma rota pública', () => {
    const resultado = {
      tipo: 'pronto',
      estado: { estado: 'autenticada', sessao: SESSAO_ADMIN },
    } as const
    expect(resolverDestinoInicial(resultado, '/clientes')).toEqual({
      tipo: 'app',
      caminho: '/clientes',
    })
    expect(resolverDestinoInicial(resultado, ROTA_LOGIN)).toEqual({
      tipo: 'app',
      caminho: ROTA_DASHBOARD,
    })
  })

  it('cliente autenticado só recebe rotas da própria área', () => {
    const resultado = {
      tipo: 'pronto',
      estado: { estado: 'autenticada', sessao: SESSAO_CLIENTE },
    } as const
    expect(resolverDestinoInicial(resultado, ROTA_DASHBOARD)).toEqual({
      tipo: 'app',
      caminho: ROTA_CLIENTE_DISPONIBILIDADE,
    })
    expect(
      resolverDestinoInicial(resultado, ROTA_CLIENTE_MINHAS_RESERVAS),
    ).toEqual({ tipo: 'app', caminho: ROTA_CLIENTE_MINHAS_RESERVAS })
    expect(resolverDestinoInicial(resultado, '/clientes')).toEqual({
      tipo: 'app',
      caminho: ROTA_CLIENTE_DISPONIBILIDADE,
    })
  })

  it('anonima preserva a rota tentada e direciona à escolha de conta', () => {
    const estado = { tipo: 'pronto', estado: { estado: 'anonima' } } as const
    expect(resolverDestinoInicial(estado, '/reservas')).toEqual({
      tipo: 'escolha-conta',
      rotaPendente: '/reservas',
    })
    expect(resolverDestinoInicial(estado, ROTA_LOGIN)).toEqual({
      tipo: 'app',
      caminho: ROTA_LOGIN,
    })
    expect(resolverDestinoInicial(estado, ROTA_ESCOLHA_CONTA)).toEqual({
      tipo: 'app',
      caminho: ROTA_ESCOLHA_CONTA,
    })
  })

  it('bootstrap só permite a própria rota', () => {
    const estado = { tipo: 'pronto', estado: { estado: 'bootstrap' } } as const
    expect(resolverDestinoInicial(estado, '/dashboard')).toEqual({
      tipo: 'primeira-execucao',
    })
    expect(resolverDestinoInicial(estado, ROTA_PRIMEIRA_EXECUCAO)).toEqual({
      tipo: 'app',
      caminho: ROTA_PRIMEIRA_EXECUCAO,
    })
  })

  it('falha ao consultar sessão não entra no app', () => {
    expect(resolverDestinoInicial({ tipo: 'erro' }, '/clientes')).toEqual({ tipo: 'erro' })
  })

  it('o guard não gera loop ao receber o próprio destino', () => {
    const anonima = { estado: 'anonima' } as const
    expect(destinoGuardiao(anonima, '/clientes')).toBe(ROTA_ESCOLHA_CONTA)
    expect(destinoGuardiao(anonima, ROTA_ESCOLHA_CONTA)).toBe(ROTA_ESCOLHA_CONTA)

    const bootstrap = { estado: 'bootstrap' } as const
    expect(destinoGuardiao(bootstrap, ROTA_LOGIN)).toBe(ROTA_PRIMEIRA_EXECUCAO)
    expect(destinoGuardiao(bootstrap, ROTA_PRIMEIRA_EXECUCAO)).toBe(ROTA_PRIMEIRA_EXECUCAO)

    const cliente = { estado: 'autenticada', sessao: SESSAO_CLIENTE } as const
    expect(destinoGuardiao(cliente, ROTA_LOGIN)).toBe(ROTA_CLIENTE_DISPONIBILIDADE)
    expect(destinoGuardiao(cliente, ROTA_CLIENTE_DISPONIBILIDADE)).toBe(
      ROTA_CLIENTE_DISPONIBILIDADE,
    )
  })

  it('a rota pendente é consumida uma única vez', () => {
    guardarRotaPendente('/pagamentos')
    guardarRotaPendente(ROTA_LOGIN)
    expect(consumirRotaPendente()).toBe('/pagamentos')
    expect(consumirRotaPendente()).toBe(ROTA_DASHBOARD)
  })
})
