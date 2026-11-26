import { describe, expect, it } from 'vitest'
import type {
  ClienteBanco,
  ParametroSql,
  RegistroBanco,
  ResultadoEscrita,
} from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { CategoriaRepositorio } from './CategoriaRepositorio'

interface Chamada {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

const SUCESSO: ResultadoEscrita = { insertId: 5, afetadas: 1 }

const linha: RegistroBanco = {
  id: 5,
  nome: 'Camping',
  descricao: 'Barracas e sacos de dormir',
  ativo: 1,
  atualizadoEm: '2026-11-25T12:00:00.000Z',
}

class ClienteBancoFalso implements ClienteBanco {
  readonly chamadas: Chamada[] = []

  constructor(private readonly totalEquipamentos = 0) {}

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    this.chamadas.push({ sql, valores })
    if (sql.includes('COUNT(*)')) return [{ total: this.totalEquipamentos }]
    return [linha]
  }

  async execute(sql: string, valores: readonly ParametroSql[] = []): Promise<ResultadoEscrita> {
    this.chamadas.push({ sql, valores })
    return SUCESSO
  }

  ultima(palavra: string): Chamada | undefined {
    return [...this.chamadas].reverse().find(({ sql }) => sql.includes(palavra))
  }

  async beginTransaction(): Promise<void> {}
  async commit(): Promise<void> {}
  async rollback(): Promise<void> {}
}

function repositorio(cliente: ClienteBanco): CategoriaRepositorio {
  const conexao = {
    obterCliente: async () => ({ cliente, liberar: () => undefined }),
  } as unknown as ConexaoBanco
  return new CategoriaRepositorio(conexao)
}

describe('CategoriaRepositorio — auditoria e SQL parametrizado', () => {
  it('mapeia ativo e atualizadoEm para CategoriaDetalhe', async () => {
    await expect(repositorio(new ClienteBancoFalso()).buscarPorId(5)).resolves.toEqual({
      id: 5,
      nome: 'Camping',
      descricao: 'Barracas e sacos de dormir',
      ativo: true,
      atualizadoEm: '2026-11-25T12:00:00.000Z',
    })
  })

  it('filtra ativos por padrão e usa parâmetro no filtro de nome', async () => {
    const cliente = new ClienteBancoFalso()

    await repositorio(cliente).listar({ nome: 'Camp' })

    const consulta = cliente.ultima('FROM categorias')
    expect(consulta?.sql).toContain('ativo = 1')
    expect(consulta?.sql).toContain('nome LIKE ?')
    expect(consulta?.valores).toEqual(['%Camp%'])
  })

  it('verifica uso por equipamento pelo nome, com parâmetro', async () => {
    const cliente = new ClienteBancoFalso(1)

    await expect(repositorio(cliente).emUsoPorEquipamento('Camping')).resolves.toBe(true)
    const consulta = cliente.ultima('COUNT(*)')
    expect(consulta?.sql).toContain('FROM equipamento WHERE categoria = ?')
    expect(consulta?.valores).toEqual(['Camping'])
  })

  it('inativa com soft delete e parâmetro', async () => {
    const cliente = new ClienteBancoFalso()

    await expect(repositorio(cliente).inativar(5)).resolves.toBe(true)

    const escrita = cliente.ultima('UPDATE categorias')
    expect(escrita?.sql).toContain('SET ativo = 0 WHERE id = ? AND ativo = 1')
    expect(escrita?.valores).toEqual([5])
  })

  it('parametriza nome e descrição na criação', async () => {
    const cliente = new ClienteBancoFalso()

    await repositorio(cliente).criar({ nome: 'Camping', descricao: null })

    const escrita = cliente.ultima('INSERT INTO categorias')
    expect(escrita?.sql).toContain('(nome, descricao) VALUES (?, ?)')
    expect(escrita?.valores).toEqual(['Camping', null])
  })
})
