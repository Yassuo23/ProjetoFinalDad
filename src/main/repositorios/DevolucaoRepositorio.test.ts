import { describe, expect, it } from 'vitest'
import type {
  ClienteBanco,
  ParametroSql,
  RegistroBanco,
  ResultadoEscrita,
} from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { DevolucaoRepositorio } from './DevolucaoRepositorio'

interface Chamada {
  readonly sql: string
  readonly valores: readonly ParametroSql[]
}

class ClienteBancoFalso implements ClienteBanco {
  readonly chamadas: Chamada[] = []
  iniciou = false
  commitou = false

  constructor(private readonly linhas: readonly RegistroBanco[] = []) {}

  async query(
    sql: string,
    valores: readonly ParametroSql[] = [],
  ): Promise<readonly RegistroBanco[]> {
    this.chamadas.push({ sql, valores })
    return [...this.linhas]
  }

  async execute(sql: string, valores: readonly ParametroSql[] = []): Promise<ResultadoEscrita> {
    this.chamadas.push({ sql, valores })
    return { insertId: 1, afetadas: 1 }
  }

  async beginTransaction(): Promise<void> {
    this.iniciou = true
  }

  async commit(): Promise<void> {
    this.commitou = true
  }

  async rollback(): Promise<void> {}

  ultima(palavra: string): Chamada | undefined {
    return [...this.chamadas].reverse().find(({ sql }) => sql.includes(palavra))
  }
}

function repositorio(cliente: ClienteBanco): DevolucaoRepositorio {
  const conexao = {
    obterCliente: async () => ({ cliente, liberar: () => undefined }),
  } as unknown as ConexaoBanco
  return new DevolucaoRepositorio(conexao)
}

const linhaDevolucao: RegistroBanco = {
  id: 1,
  reservaId: 7,
  dataDevolucaoEfetiva: '2026-01-13T12:00:00.000Z',
  estadoPosUso: 'Danificado',
  observacoes: 'Avaria no quadro',
  ativo: 1,
  atualizadoEm: '2026-01-13T12:00:00.000Z',
}

describe('DevolucaoRepositorio — efeitos atômicos', () => {
  it('atualiza conservação e disponibilidade na mesma transação', async () => {
    const cliente = new ClienteBancoFalso([linhaDevolucao])

    await repositorio(cliente).criarComEfeitos(
      { reservaId: 7, estadoPosUso: 'Danificado' },
      { valorMulta: 40, manutencao: true },
    )

    const equipamento = cliente.ultima('UPDATE equipamento')
    expect(equipamento?.sql).toContain("estado_conservacao = 'Em Manutenção'")
    expect(equipamento?.sql).toContain("disponibilidade = 'Em manutenção'")

    const multa = cliente.ultima('UPDATE pagamento')
    expect(multa?.sql).toContain('valor_total = valor_base + ?')
    expect(multa?.valores).toEqual([40, 40, 7])

    expect(cliente.iniciou).toBe(true)
    expect(cliente.commitou).toBe(true)
  })

  it('não toca no equipamento quando não há manutenção', async () => {
    const cliente = new ClienteBancoFalso([linhaDevolucao])

    await repositorio(cliente).criarComEfeitos(
      { reservaId: 7, estadoPosUso: 'Perfeito' },
      { valorMulta: 0, manutencao: false },
    )

    expect(cliente.chamadas.some(({ sql }) => sql.includes('UPDATE equipamento'))).toBe(false)
  })

  it('converte a data efetiva ISO antes de gravar', async () => {
    const cliente = new ClienteBancoFalso([linhaDevolucao])

    await repositorio(cliente).criarComEfeitos(
      {
        reservaId: 7,
        estadoPosUso: 'Perfeito',
        dataDevolucaoEfetiva: '2026-01-13T12:00:00.000Z',
      },
      { valorMulta: 0, manutencao: false },
    )

    const insert = cliente.ultima('INSERT INTO devolucao')
    expect(insert?.valores).toContain('2026-01-13 12:00:00')
  })

  it('busca pendentes parametrizando a data de referência', async () => {
    const cliente = new ClienteBancoFalso()

    await repositorio(cliente).listarPendentes('2026-01-13')

    const consulta = cliente.ultima('FROM reserva r')
    expect(consulta?.sql).toContain('NOT EXISTS')
    expect(consulta?.sql).toContain("r.status_reserva IN ('Confirmada', 'Concluída')")
    expect(consulta?.valores).toEqual(['2026-01-13'])
  })
})
