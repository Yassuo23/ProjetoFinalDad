import type { DatabaseSync } from 'node:sqlite'
import { ESTADOS_EQUIPAMENTO, type EstadoEquipamento } from '../../shared/contratos/estados'
import type {
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoDisponiveisEntrada,
  EquipamentoListarFiltros,
} from '../../shared/contratos/modelos'

/** Porta usada pelo serviço; implementação trocável nos testes. */
export interface RepositorioEquipamentos {
  listar(filtros?: EquipamentoListarFiltros): Equipamento[]
  buscarPorId(id: number): Equipamento | null
  criar(dados: EquipamentoCriarEntrada): Equipamento
  atualizar(dados: EquipamentoAtualizarEntrada): Equipamento | null
  inativar(id: number): boolean
  listarDisponiveis(periodo: EquipamentoDisponiveisEntrada): Equipamento[]
  nomeEmUso(nome: string, idExcluido?: number): boolean
}

const COLUNAS = `
  id,
  nome,
  categoria_id AS categoriaId,
  preco_diaria AS precoDiaria,
  valor_aquisicao AS valorAquisicao,
  estado,
  ativo,
  descricao
`

/** Acesso a dados de equipamentos. SQL sempre parametrizado; nenhuma regra de negócio. */
export class EquipamentoRepositorio implements RepositorioEquipamentos {
  constructor(private readonly db: DatabaseSync) {}

  listar(filtros: EquipamentoListarFiltros = {}): Equipamento[] {
    const sql = `
      SELECT ${COLUNAS}
      FROM equipamentos
      WHERE ativo = 1
        AND categoria_id = COALESCE(?, categoria_id)
        AND estado = COALESCE(?, estado)
      ORDER BY nome COLLATE NOCASE
    `
    const linhas = this.db
      .prepare(sql)
      .all(filtros.categoriaId ?? null, filtros.estado ?? null)
    return linhas.map((linha) => paraEquipamento(linha))
  }

  buscarPorId(id: number): Equipamento | null {
    const linha = this.db
      .prepare(`SELECT ${COLUNAS} FROM equipamentos WHERE id = ? AND ativo = 1`)
      .get(id)
    return linha ? paraEquipamento(linha) : null
  }

  criar(dados: EquipamentoCriarEntrada): Equipamento {
    const resultado = this.db
      .prepare(`
        INSERT INTO equipamentos (nome, categoria_id, preco_diaria, valor_aquisicao, descricao)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(
        dados.nome,
        dados.categoriaId,
        dados.precoDiaria,
        dados.valorAquisicao,
        dados.descricao ?? null,
      )

    const criado = this.buscarPorId(Number(resultado.lastInsertRowid))
    if (!criado) throw new Error('EQUIPAMENTO_LINHA_INVALIDA')
    return criado
  }

  atualizar(dados: EquipamentoAtualizarEntrada): Equipamento | null {
    const resultado = this.db
      .prepare(`
        UPDATE equipamentos
        SET nome = COALESCE(?, nome),
            categoria_id = COALESCE(?, categoria_id),
            preco_diaria = COALESCE(?, preco_diaria),
            valor_aquisicao = COALESCE(?, valor_aquisicao),
            estado = COALESCE(?, estado),
            descricao = CASE WHEN ? = 1 THEN ? ELSE descricao END
        WHERE id = ? AND ativo = 1
      `)
      .run(
        dados.nome ?? null,
        dados.categoriaId ?? null,
        dados.precoDiaria ?? null,
        dados.valorAquisicao ?? null,
        dados.estado ?? null,
        dados.descricao === undefined ? 0 : 1,
        dados.descricao ?? null,
        dados.id,
      )

    return resultado.changes > 0 ? this.buscarPorId(dados.id) : null
  }

  inativar(id: number): boolean {
    const resultado = this.db
      .prepare('UPDATE equipamentos SET ativo = 0 WHERE id = ? AND ativo = 1')
      .run(id)
    return resultado.changes > 0
  }

  /** P4 (Disponibilidade) acrescentará a interseção com reservas ativas sobrepostas. */
  listarDisponiveis(periodo: EquipamentoDisponiveisEntrada): Equipamento[] {
    const linhas = this.db
      .prepare(`
        SELECT ${COLUNAS}
        FROM equipamentos
        WHERE ativo = 1
          AND estado = 'disponivel'
          AND categoria_id = COALESCE(?, categoria_id)
        ORDER BY nome COLLATE NOCASE
      `)
      .all(periodo.categoriaId ?? null)
    return linhas.map((linha) => paraEquipamento(linha))
  }

  nomeEmUso(nome: string, idExcluido?: number): boolean {
    const linha = this.db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM equipamentos
        WHERE lower(nome) = lower(?)
          AND id != COALESCE(?, -1)
      `)
      .get(nome, idExcluido ?? null)
    return Number(linha?.total ?? 0) > 0
  }
}

function ehEstado(valor: unknown): valor is EstadoEquipamento {
  return typeof valor === 'string' && (ESTADOS_EQUIPAMENTO as readonly string[]).includes(valor)
}

function paraEquipamento(linha: Record<string, unknown>): Equipamento {
  const { id, nome, categoriaId, precoDiaria, valorAquisicao, estado, ativo, descricao } = linha

  const idValido = typeof id === 'number' || typeof id === 'bigint'
  const categoriaValida = typeof categoriaId === 'number' || typeof categoriaId === 'bigint'
  const precoValido = typeof precoDiaria === 'number' || typeof precoDiaria === 'bigint'
  const aquisicaoValida = typeof valorAquisicao === 'number' || typeof valorAquisicao === 'bigint'
  const descricaoValida = descricao === null || typeof descricao === 'string'

  if (
    !idValido ||
    typeof nome !== 'string' ||
    !categoriaValida ||
    !precoValido ||
    !aquisicaoValida ||
    !ehEstado(estado) ||
    typeof ativo !== 'number' ||
    !descricaoValida
  ) {
    throw new Error('EQUIPAMENTO_LINHA_INVALIDA')
  }

  return {
    id: Number(id),
    nome,
    categoriaId: Number(categoriaId),
    precoDiaria: Number(precoDiaria),
    valorAquisicao: Number(valorAquisicao),
    estado,
    ativo: ativo === 1,
    descricao,
  }
}
