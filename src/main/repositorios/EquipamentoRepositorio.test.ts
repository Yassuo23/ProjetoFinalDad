import { describe, expect, it } from 'vitest'
import type { DisponibilidadeEquipamento, PeriodoEntrada } from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco, ResultadoEscrita } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { EquipamentoRepositorio } from './EquipamentoRepositorio'

const SUCESSO: ResultadoEscrita = { insertId: 7, afetadas: 1 }
const periodo: PeriodoEntrada = { dataInicio: '2026-02-10', dataFim: '2026-02-12' }

interface Chamada {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

function linha(id: number, disponibilidade: string): RegistroBanco {
  return {
    id,
    nome: `Equipamento ${id}`,
    categoria: 'Bicicleta',
    estadoConservacao: 'Bom',
    disponibilidade,
    fornecedorId: null,
    ativo: 1,
    atualizadoEm: '2026-01-01T00:00:00.000Z',
  }
}

class ClienteBancoFalso implements ClienteBanco {
  readonly chamadas: Chamada[] = []

  constructor(private readonly linhas: readonly RegistroBanco[]) {}

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    this.chamadas.push({ sql, valores })
    // Espelha o predicado da consulta real para provar a exclusão na prática.
    if (sql.includes('e.disponibilidade =')) {
      return this.linhas.filter((item) => item.disponibilidade === 'Disponível')
    }
    return this.linhas
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

function repositorio(cliente: ClienteBanco): EquipamentoRepositorio {
  const conexao = {
    obterCliente: async () => ({ cliente, liberar: () => undefined }),
  } as unknown as ConexaoBanco
  return new EquipamentoRepositorio(conexao)
}

describe('EquipamentoRepositorio — disponibilidade', () => {
  it('mapeia a coluna para os três valores aceitos', async () => {
    const valores: readonly DisponibilidadeEquipamento[] = [
      'Disponível',
      'Indisponível',
      'Em manutenção',
    ]
    for (const [indice, valor] of valores.entries()) {
      const repo = repositorio(new ClienteBancoFalso([linha(indice + 1, valor)]))

      await expect(repo.buscarPorId(indice + 1)).resolves.toMatchObject({
        disponibilidade: valor,
      })
    }
  })

  it('rejeita valor fora do domínio na leitura', async () => {
    const repo = repositorio(new ClienteBancoFalso([linha(1, '')]))

    await expect(repo.buscarPorId(1)).rejects.toThrow('EQUIPAMENTO_LINHA_INVALIDA')
  })

  it('filtra por disponibilidade de forma parametrizada', async () => {
    const cliente = new ClienteBancoFalso([])

    await repositorio(cliente).listar({ disponibilidade: 'Em manutenção' })

    const consulta = cliente.ultima('FROM equipamento')
    expect(consulta?.sql).toContain('disponibilidade = ?')
    expect(consulta?.valores).toContain('Em manutenção')
  })

  it('listarDisponiveis exclui Indisponível e Em manutenção', async () => {
    const cliente = new ClienteBancoFalso([
      linha(1, 'Disponível'),
      linha(2, 'Indisponível'),
      linha(3, 'Em manutenção'),
    ])

    const itens = await repositorio(cliente).listarDisponiveis(periodo)

    expect(itens.map((item) => item.id)).toEqual([1])
    expect(cliente.ultima('FROM equipamento e')?.sql).toContain(
      "e.disponibilidade = 'Disponível'",
    )
  })

  it('grava o default na inserção quando o chamador omite o campo', async () => {
    const cliente = new ClienteBancoFalso([linha(7, 'Disponível')])

    await repositorio(cliente).criar({
      nome: 'Barraca',
      categoria: 'Camping',
      estadoConservacao: 'Bom',
    })

    const insert = cliente.ultima('INSERT INTO equipamento')
    expect(insert?.sql).toContain('disponibilidade')
    expect(insert?.valores[3]).toBe('Disponível')
  })

  it('respeita o valor explícito na inserção e na atualização', async () => {
    const cliente = new ClienteBancoFalso([linha(7, 'Indisponível')])
    const repo = repositorio(cliente)

    await repo.criar({
      nome: 'Barraca',
      categoria: 'Camping',
      estadoConservacao: 'Bom',
      disponibilidade: 'Indisponível',
    })
    await repo.atualizar({ id: 7, disponibilidade: 'Em manutenção' })

    expect(cliente.ultima('INSERT INTO equipamento')?.valores[3]).toBe('Indisponível')
    const update = cliente.ultima('UPDATE equipamento SET')
    expect(update?.sql).toContain('disponibilidade = ?')
    expect(update?.valores).toContain('Em manutenção')
  })
})
