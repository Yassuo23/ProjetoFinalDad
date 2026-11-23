import type { DatabaseSync } from 'node:sqlite'
import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClientesListarFiltros,
} from '../../shared/contratos/modelos'

/** Porta usada pelo serviço; implementação trocável nos testes. */
export interface RepositorioClientes {
  listar(filtros?: ClientesListarFiltros): Cliente[]
  buscarPorId(id: number): Cliente | null
  criar(dados: ClienteCriarEntrada): Cliente
  atualizar(dados: ClienteAtualizarEntrada): Cliente | null
  inativar(id: number): boolean
  emailEmUso(email: string, idExcluido?: number): boolean
}

const COLUNAS = `
  id,
  nome,
  email,
  telefone,
  cep,
  logradouro,
  numero,
  complemento,
  bairro,
  cidade,
  uf,
  ativo
`

/** Acesso a dados de clientes. SQL sempre parametrizado; nenhuma regra de negócio. */
export class ClienteRepositorio implements RepositorioClientes {
  constructor(private readonly db: DatabaseSync) {}

  listar(filtros: ClientesListarFiltros = {}): Cliente[] {
    const linhas = this.db
      .prepare(`
        SELECT ${COLUNAS}
        FROM clientes
        WHERE ativo = COALESCE(?, 1)
          AND nome LIKE '%' || ? || '%' COLLATE NOCASE
        ORDER BY nome COLLATE NOCASE
      `)
      .all(filtros.ativo === undefined ? null : filtros.ativo ? 1 : 0, filtros.nome ?? '')
    return linhas.map((linha) => paraCliente(linha))
  }

  buscarPorId(id: number): Cliente | null {
    const linha = this.db
      .prepare(`SELECT ${COLUNAS} FROM clientes WHERE id = ? AND ativo = 1`)
      .get(id)
    return linha ? paraCliente(linha) : null
  }

  criar(dados: ClienteCriarEntrada): Cliente {
    const resultado = this.db
      .prepare(`
        INSERT INTO clientes
          (nome, email, telefone, cep, logradouro, numero, complemento, bairro, cidade, uf)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        dados.nome,
        dados.email ?? null,
        dados.telefone ?? null,
        dados.cep ?? null,
        dados.logradouro ?? null,
        dados.numero ?? null,
        dados.complemento ?? null,
        dados.bairro ?? null,
        dados.cidade ?? null,
        dados.uf ?? null,
      )

    const criado = this.buscarPorId(Number(resultado.lastInsertRowid))
    if (!criado) throw new Error('CLIENTE_LINHA_INVALIDA')
    return criado
  }

  atualizar(dados: ClienteAtualizarEntrada): Cliente | null {
    const resultado = this.db
      .prepare(`
        UPDATE clientes
        SET nome = COALESCE(?, nome),
            email = CASE WHEN ? = 1 THEN ? ELSE email END,
            telefone = CASE WHEN ? = 1 THEN ? ELSE telefone END,
            cep = CASE WHEN ? = 1 THEN ? ELSE cep END,
            logradouro = CASE WHEN ? = 1 THEN ? ELSE logradouro END,
            numero = CASE WHEN ? = 1 THEN ? ELSE numero END,
            complemento = CASE WHEN ? = 1 THEN ? ELSE complemento END,
            bairro = CASE WHEN ? = 1 THEN ? ELSE bairro END,
            cidade = CASE WHEN ? = 1 THEN ? ELSE cidade END,
            uf = CASE WHEN ? = 1 THEN ? ELSE uf END
        WHERE id = ? AND ativo = 1
      `)
      .run(
        dados.nome ?? null,
        ...valorOpcional(dados.email),
        ...valorOpcional(dados.telefone),
        ...valorOpcional(dados.cep),
        ...valorOpcional(dados.logradouro),
        ...valorOpcional(dados.numero),
        ...valorOpcional(dados.complemento),
        ...valorOpcional(dados.bairro),
        ...valorOpcional(dados.cidade),
        ...valorOpcional(dados.uf),
        dados.id,
      )

    return resultado.changes > 0 ? this.buscarPorId(dados.id) : null
  }

  inativar(id: number): boolean {
    const resultado = this.db
      .prepare('UPDATE clientes SET ativo = 0 WHERE id = ? AND ativo = 1')
      .run(id)
    return resultado.changes > 0
  }

  /** Inclui inativos: o UNIQUE do e-mail vale para toda a tabela, não só para os ativos. */
  emailEmUso(email: string, idExcluido?: number): boolean {
    const linha = this.db
      .prepare(`
        SELECT COUNT(*) AS total
        FROM clientes
        WHERE lower(email) = lower(?)
          AND id != COALESCE(?, -1)
      `)
      .get(email, idExcluido ?? null)
    return Number(linha?.total ?? 0) > 0
  }
}

/** `undefined` mantém o valor atual; `null` limpa o campo. */
function valorOpcional(valor: string | null | undefined): [number, string | null] {
  return valor === undefined ? [0, null] : [1, valor]
}

function textoOpcional(valor: unknown): valor is string | null {
  return valor === null || typeof valor === 'string'
}

function paraCliente(linha: Record<string, unknown>): Cliente {
  const {
    id,
    nome,
    email,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    ativo,
  } = linha

  const idValido = typeof id === 'number' || typeof id === 'bigint'

  if (
    !idValido ||
    typeof nome !== 'string' ||
    !textoOpcional(email) ||
    !textoOpcional(telefone) ||
    !textoOpcional(cep) ||
    !textoOpcional(logradouro) ||
    !textoOpcional(numero) ||
    !textoOpcional(complemento) ||
    !textoOpcional(bairro) ||
    !textoOpcional(cidade) ||
    !textoOpcional(uf) ||
    typeof ativo !== 'number'
  ) {
    throw new Error('CLIENTE_LINHA_INVALIDA')
  }

  return {
    id: Number(id),
    nome,
    email,
    telefone,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    uf,
    ativo: ativo === 1,
  }
}
