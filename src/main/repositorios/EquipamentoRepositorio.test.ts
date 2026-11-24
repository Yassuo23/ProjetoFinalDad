import { describe, expect, it } from 'vitest'
import { ConexaoBanco } from '../banco/ConexaoBanco'
import { Migrador } from '../banco/Migrador'
import { MIGRACOES } from '../banco/migracoes'
import { EquipamentoRepositorio } from './EquipamentoRepositorio'

const PERIODO = {
  inicio: '2026-12-01T00:00:00.000Z',
  fim: '2026-12-05T00:00:00.000Z',
}

function bancoComMigracoes(): ConexaoBanco {
  const conexao = new ConexaoBanco(':memory:')
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()
  return conexao
}

describe('EquipamentoRepositorio', () => {
  it('cria, lê e atualiza equipamentos com SQL parametrizado', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new EquipamentoRepositorio(conexao.db)

    const criado = repositorio.criar({
      nome: "Barraca d'água",
      categoriaId: 1,
      precoDiaria: 80,
      valorAquisicao: 900,
    })
    expect(criado).toMatchObject({
      nome: "Barraca d'água",
      estado: 'disponivel',
      ativo: true,
      descricao: null,
    })

    const atualizado = repositorio.atualizar({ id: criado.id, estado: 'em_manutencao' })
    expect(atualizado?.estado).toBe('em_manutencao')
    expect(repositorio.buscarPorId(criado.id)?.precoDiaria).toBe(80)

    conexao.fechar()
  })

  it('filtra por categoria e estado e respeita a inativação lógica', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new EquipamentoRepositorio(conexao.db)
    const categoriaId = 1

    const a = repositorio.criar({
      nome: 'Tenda A',
      categoriaId,
      precoDiaria: 80,
      valorAquisicao: 900,
    })
    repositorio.criar({
      nome: 'Tenda B',
      categoriaId: 2,
      precoDiaria: 50,
      valorAquisicao: 400,
    })
    repositorio.atualizar({ id: a.id, estado: 'baixado' })

    expect(repositorio.listar({ categoriaId })).toHaveLength(1)
    expect(repositorio.listar({ estado: 'baixado' }).map((item) => item.id)).toEqual([a.id])
    expect(repositorio.listarDisponiveis(PERIODO)).toHaveLength(1)

    expect(repositorio.inativar(a.id)).toBe(true)
    expect(repositorio.inativar(a.id)).toBe(false)
    expect(repositorio.buscarPorId(a.id)).toBeNull()
    expect(repositorio.listar()).toHaveLength(1)

    conexao.fechar()
  })

  it('detecta nome repetido ignorando caixa e o próprio id', () => {
    const conexao = bancoComMigracoes()
    const repositorio = new EquipamentoRepositorio(conexao.db)
    const equipamento = repositorio.criar({
      nome: 'Corda',
      categoriaId: 1,
      precoDiaria: 30,
      valorAquisicao: 200,
    })

    expect(repositorio.nomeEmUso('corda')).toBe(true)
    expect(repositorio.nomeEmUso('Corda', equipamento.id)).toBe(false)
    expect(repositorio.nomeEmUso('Outra')).toBe(false)

    conexao.fechar()
  })
})
