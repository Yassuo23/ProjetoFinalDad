import { describe, expect, it } from 'vitest'
import { ConexaoBanco } from '../banco/ConexaoBanco'
import { Migrador } from '../banco/Migrador'
import { MIGRACOES } from '../banco/migracoes'
import { ClienteRepositorio } from './ClienteRepositorio'

function bancoComMigracoes(): ConexaoBanco {
  const conexao = new ConexaoBanco(':memory:')
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()
  return conexao
}

describe('ClienteRepositorio', () => {
  it('cria, lê e atualiza cliente com endereço completo', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ClienteRepositorio(conexao.db)

    const criado = repositorio.criar({
      nome: "Ana d'Água",
      email: 'ana@example.com',
      telefone: '11999999999',
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '10',
      complemento: 'Apto 2',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    })
    expect(criado).toMatchObject({
      nome: "Ana d'Água",
      email: 'ana@example.com',
      cep: '01001-000',
      numero: '10',
      uf: 'SP',
      ativo: true,
    })

    const atualizado = repositorio.atualizar({
      id: criado.id,
      nome: 'Ana Lima',
      complemento: null,
      uf: 'RJ',
    })
    expect(atualizado).toMatchObject({
      nome: 'Ana Lima',
      complemento: null,
      uf: 'RJ',
      logradouro: 'Praça da Sé',
      email: 'ana@example.com',
    })

    conexao.fechar()
  })

  it('filtra por nome e ativo, ordena por nome e respeita a inativação lógica', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ClienteRepositorio(conexao.db)

    const ana = repositorio.criar({ nome: 'Ana' })
    repositorio.criar({ nome: 'bruno' })
    repositorio.criar({ nome: 'Carla' })

    expect(repositorio.listar().map((cliente) => cliente.nome)).toEqual(['Ana', 'bruno', 'Carla'])
    expect(repositorio.listar({ nome: 'an' }).map((cliente) => cliente.nome)).toEqual(['Ana'])
    expect(repositorio.listar({ ativo: false })).toHaveLength(0)

    expect(repositorio.inativar(ana.id)).toBe(true)
    expect(repositorio.inativar(ana.id)).toBe(false)
    expect(repositorio.buscarPorId(ana.id)).toBeNull()
    expect(repositorio.listar({ ativo: false }).map((cliente) => cliente.id)).toEqual([ana.id])
    expect(repositorio.listar()).toHaveLength(2)

    conexao.fechar()
  })

  it('detecta e-mail repetido ignorando caixa, o próprio id e incluindo inativos', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ClienteRepositorio(conexao.db)
    const ana = repositorio.criar({ nome: 'Ana', email: 'Ana@Exemplo.com' })

    expect(repositorio.emailEmUso('ana@exemplo.com')).toBe(true)
    expect(repositorio.emailEmUso('ANA@exemplo.com', ana.id)).toBe(false)
    expect(repositorio.emailEmUso('outro@exemplo.com')).toBe(false)

    repositorio.inativar(ana.id)
    expect(repositorio.emailEmUso('ana@exemplo.com')).toBe(true)

    conexao.fechar()
  })

  it('mantém o SQL parametrizado mesmo com aspas e tentativa de injeção no nome', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new ClienteRepositorio(conexao.db)
    const nome = "x'); DROP TABLE clientes; --"

    expect(repositorio.criar({ nome }).nome).toBe(nome)
    expect(repositorio.listar({ nome: "x'); DROP" }).map((cliente) => cliente.nome)).toEqual([
      nome,
    ])

    conexao.fechar()
  })
})
