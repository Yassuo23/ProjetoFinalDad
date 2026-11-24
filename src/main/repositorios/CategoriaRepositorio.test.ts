import { describe, expect, it } from 'vitest'
import { ConexaoBanco } from '../banco/ConexaoBanco'
import { Migrador } from '../banco/Migrador'
import { MIGRACOES } from '../banco/migracoes'
import { CategoriaRepositorio } from './CategoriaRepositorio'

function bancoComMigracoes(): ConexaoBanco {
  const conexao = new ConexaoBanco(':memory:')
  new Migrador(conexao.db, MIGRACOES).aplicarPendentes()
  return conexao
}

describe('CategoriaRepositorio', () => {
  it('lê as categorias do banco em memória e mapeia para o modelo', () => {
    const conexao = bancoComMigracoes()
    const categorias = new CategoriaRepositorio(conexao.db).listar()

    expect(categorias).toHaveLength(4)
    expect(categorias.map((categoria) => categoria.nome)).toContain('Camping')
    expect(categorias.every((categoria) => typeof categoria.id === 'number')).toBe(true)
    expect(categorias[0]?.descricao).toBeTypeOf('string')

    conexao.fechar()
  })

  it('mantém nomes com aspas intactos (SQL parametrizado)', () => {
    const conexao = bancoComMigracoes()
    conexao.db.prepare('INSERT INTO categorias (nome, descricao) VALUES (?, ?)').run(
      "Trilha d'água",
      null,
    )

    const nomes = new CategoriaRepositorio(conexao.db).listar().map((categoria) => categoria.nome)
    expect(nomes).toContain("Trilha d'água")

    conexao.fechar()
  })
})
