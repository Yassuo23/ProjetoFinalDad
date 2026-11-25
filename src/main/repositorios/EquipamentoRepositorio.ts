import type {
  CategoriaEquipamento,
  DisponibilidadeEquipamento,
  Equipamento,
  EquipamentoAtualizarEntrada,
  EquipamentoCriarEntrada,
  EquipamentoListarFiltros,
  EstadoConservacao,
  PeriodoEntrada,
} from '../../shared/contratos/modelos'
import type { ClienteBanco, ParametroSql, RegistroBanco } from '../banco/ClienteBanco'
import type { ConexaoBanco } from '../banco/ConexaoBanco'
import { ErroDeDominio, paraErroDominio } from '../banco/ErrosBanco'
import { booleano, dataHora, numero, numeroOpcional, texto, textoEnumerado } from './mapeamento'
import type { RepositorioEquipamentos } from './portas'
import { RepositorioBase } from './RepositorioBase'

const CATEGORIAS: readonly CategoriaEquipamento[] = ['Bicicleta', 'Caiaque', 'Prancha', 'Camping']
const ESTADOS: readonly EstadoConservacao[] = ['Novo', 'Bom', 'Desgastado', 'Em Manutenção']
const DISPONIBILIDADES: readonly DisponibilidadeEquipamento[] = [
  'Disponível',
  'Indisponível',
  'Em manutenção',
]
const PADRAO_DISPONIBILIDADE: DisponibilidadeEquipamento = 'Disponível'

const CONSULTAR = `
  SELECT id_equipamento AS id, nome, categoria, estado_conservacao AS estadoConservacao,
         disponibilidade, id_fornecedor AS fornecedorId, valor_diaria AS valorDiaria, ativo,
         atualizado_em AS atualizadoEm
  FROM equipamento
`

function mapearEquipamento(linha: RegistroBanco): Equipamento {
  return {
    id: numero(linha, 'id', 'EQUIPAMENTO'),
    nome: texto(linha, 'nome', 'EQUIPAMENTO'),
    categoria: textoEnumerado(linha, 'categoria', 'EQUIPAMENTO', CATEGORIAS),
    estadoConservacao: textoEnumerado(linha, 'estadoConservacao', 'EQUIPAMENTO', ESTADOS),
    disponibilidade: textoEnumerado(linha, 'disponibilidade', 'EQUIPAMENTO', DISPONIBILIDADES),
    fornecedorId: numeroOpcional(linha, 'fornecedorId', 'EQUIPAMENTO'),
    // DECIMAL volta como string; nulo/missing (legado) vira 0 sem perder a conversão segura.
    valorDiaria: numeroOpcional(linha, 'valorDiaria', 'EQUIPAMENTO') ?? 0,
    ativo: booleano(linha, 'ativo', 'EQUIPAMENTO'),
    atualizadoEm: dataHora(linha, 'atualizadoEm', 'EQUIPAMENTO'),
  }
}

export class EquipamentoRepositorio extends RepositorioBase implements RepositorioEquipamentos {
  constructor(conexao: ConexaoBanco) {
    super(conexao)
  }

  async listar(filtros: EquipamentoListarFiltros = {}): Promise<readonly Equipamento[]> {
    const condicoes: string[] = []
    const valores: ParametroSql[] = []

    if (filtros.incluirInativos !== true) condicoes.push('ativo = 1')
    if (filtros.nome !== undefined) {
      condicoes.push('nome LIKE ?')
      valores.push(`%${filtros.nome}%`)
    }
    if (filtros.categoria !== undefined) {
      condicoes.push('categoria = ?')
      valores.push(filtros.categoria)
    }
    if (filtros.estadoConservacao !== undefined) {
      condicoes.push('estado_conservacao = ?')
      valores.push(filtros.estadoConservacao)
    }
    if (filtros.disponibilidade !== undefined) {
      condicoes.push('disponibilidade = ?')
      valores.push(filtros.disponibilidade)
    }
    if (filtros.fornecedorId !== undefined) {
      condicoes.push('id_fornecedor = ?')
      valores.push(filtros.fornecedorId)
    }
    if (filtros.somenteDisponiveis === true) {
      condicoes.push("estado_conservacao <> 'Em Manutenção'")
    }

    const where = condicoes.length > 0 ? ` WHERE ${condicoes.join(' AND ')}` : ''
    const paginacao = filtros.limite !== undefined ? ' LIMIT ? OFFSET ?' : ''
    if (filtros.limite !== undefined) valores.push(filtros.limite, filtros.deslocamento ?? 0)

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `${CONSULTAR}${where} ORDER BY nome, id_equipamento${paginacao}`,
        valores,
      )
      return linhas.map(mapearEquipamento)
    })
  }

  async listarDisponiveis(periodo: PeriodoEntrada): Promise<readonly Equipamento[]> {
    const sql = `
      SELECT e.id_equipamento AS id, e.nome, e.categoria,
             e.estado_conservacao AS estadoConservacao, e.disponibilidade,
             e.id_fornecedor AS fornecedorId, e.valor_diaria AS valorDiaria, e.ativo,
             e.atualizado_em AS atualizadoEm
      FROM equipamento e
      WHERE e.ativo = 1 AND e.estado_conservacao <> 'Em Manutenção'
        AND e.disponibilidade = 'Disponível'
        AND NOT EXISTS (
          SELECT 1 FROM item_reserva ir
          JOIN reserva r ON r.id_reserva = ir.id_reserva
          WHERE ir.id_equipamento = e.id_equipamento
            AND r.status_reserva = 'Confirmada'
            AND r.ativo = 1
            AND r.data_inicio <= ?
            AND r.data_fim >= ?
            AND r.id_reserva <> COALESCE(?, -1)
        )
      ORDER BY e.nome, e.id_equipamento
    `

    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(sql, [
        periodo.dataFim,
        periodo.dataInicio,
        periodo.reservaId ?? null,
      ])
      return linhas.map(mapearEquipamento)
    })
  }

  async buscarPorId(id: number): Promise<Equipamento | null> {
    return this.comCliente((cliente) => this.lerPorId(cliente, id))
  }

  async criar(dados: EquipamentoCriarEntrada): Promise<Equipamento> {
    return this.comCliente(async (cliente) => {
      let id: number
      try {
        const resultado = await cliente.execute(
          `INSERT INTO equipamento
             (nome, categoria, estado_conservacao, disponibilidade, id_fornecedor, valor_diaria)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            dados.nome,
            dados.categoria,
            dados.estadoConservacao,
            dados.disponibilidade ?? PADRAO_DISPONIBILIDADE,
            dados.fornecedorId ?? null,
            dados.valorDiaria ?? 0,
          ],
        )
        id = resultado.insertId
      } catch (erro) {
        throw paraErroDominio(erro, 'equipamento')
      }

      const criado = await this.lerPorId(cliente, id)
      if (!criado) {
        throw new ErroDeDominio('NAO_ENCONTRADO', 'Equipamento não encontrado após a criação.')
      }
      return criado
    })
  }

  async atualizar(dados: EquipamentoAtualizarEntrada): Promise<Equipamento | null> {
    const campos: string[] = []
    const valores: ParametroSql[] = []

    if (dados.nome !== undefined) {
      campos.push('nome = ?')
      valores.push(dados.nome)
    }
    if (dados.categoria !== undefined) {
      campos.push('categoria = ?')
      valores.push(dados.categoria)
    }
    if (dados.estadoConservacao !== undefined) {
      campos.push('estado_conservacao = ?')
      valores.push(dados.estadoConservacao)
    }
    if (dados.disponibilidade !== undefined) {
      campos.push('disponibilidade = ?')
      valores.push(dados.disponibilidade)
    }
    if (dados.fornecedorId !== undefined) {
      campos.push('id_fornecedor = ?')
      valores.push(dados.fornecedorId)
    }
    if (dados.valorDiaria !== undefined) {
      campos.push('valor_diaria = ?')
      valores.push(dados.valorDiaria)
    }
    if (campos.length === 0) return null

    valores.push(dados.id)
    return this.comCliente(async (cliente) => {
      try {
        await cliente.execute(
          `UPDATE equipamento SET ${campos.join(', ')} WHERE id_equipamento = ?`,
          valores,
        )
      } catch (erro) {
        throw paraErroDominio(erro, 'equipamento')
      }
      return this.lerPorId(cliente, dados.id)
    })
  }

  async inativar(id: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      try {
        const resultado = await cliente.execute(
          'UPDATE equipamento SET ativo = 0 WHERE id_equipamento = ? AND ativo = 1',
          [id],
        )
        return resultado.afetadas > 0
      } catch (erro) {
        throw paraErroDominio(erro, 'equipamento')
      }
    })
  }

  async nomeEmUso(nome: string, idExcluido?: number): Promise<boolean> {
    return this.comCliente(async (cliente) => {
      const linhas = await cliente.query(
        `SELECT COUNT(*) AS total FROM equipamento
         WHERE nome = ? AND id_equipamento <> COALESCE(?, -1)`,
        [nome, idExcluido ?? null],
      )
      return numero(linhas[0] ?? {}, 'total', 'EQUIPAMENTO') > 0
    })
  }

  private async lerPorId(cliente: ClienteBanco, id: number): Promise<Equipamento | null> {
    const linhas = await cliente.query(`${CONSULTAR} WHERE id_equipamento = ? LIMIT 1`, [id])
    const linha = linhas[0]
    return linha ? mapearEquipamento(linha) : null
  }
}
