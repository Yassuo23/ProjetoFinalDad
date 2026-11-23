import { describe, expect, it } from 'vitest'
import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  CodigoErroDominio,
} from '../../shared/contratos/modelos'
import type { RepositorioClientes } from '../repositorios/ClienteRepositorio'
import { ErroDeDominio } from './ErroDominio'
import { ClienteServico } from './ClienteServico'

class RepositorioClientesFalso implements RepositorioClientes {
  private readonly itens: Cliente[]

  constructor(itens: Cliente[] = []) {
    this.itens = [...itens]
  }

  listar(): Cliente[] {
    return [...this.itens]
  }

  buscarPorId(id: number): Cliente | null {
    const item = this.itens.find((cliente) => cliente.id === id)
    return item?.ativo ? item : null
  }

  criar(dados: ClienteCriarEntrada): Cliente {
    const criado: Cliente = {
      id: this.itens.length + 1,
      nome: dados.nome,
      email: dados.email ?? null,
      telefone: dados.telefone ?? null,
      cep: dados.cep ?? null,
      logradouro: dados.logradouro ?? null,
      numero: dados.numero ?? null,
      complemento: dados.complemento ?? null,
      bairro: dados.bairro ?? null,
      cidade: dados.cidade ?? null,
      uf: dados.uf ?? null,
      ativo: true,
    }
    this.itens.push(criado)
    return criado
  }

  atualizar(dados: ClienteAtualizarEntrada): Cliente | null {
    const item = this.buscarPorId(dados.id)
    if (!item) return null

    if (dados.nome !== undefined) item.nome = dados.nome
    if (dados.email !== undefined) item.email = dados.email
    if (dados.telefone !== undefined) item.telefone = dados.telefone
    if (dados.cep !== undefined) item.cep = dados.cep
    if (dados.logradouro !== undefined) item.logradouro = dados.logradouro
    if (dados.numero !== undefined) item.numero = dados.numero
    if (dados.complemento !== undefined) item.complemento = dados.complemento
    if (dados.bairro !== undefined) item.bairro = dados.bairro
    if (dados.cidade !== undefined) item.cidade = dados.cidade
    if (dados.uf !== undefined) item.uf = dados.uf
    return item
  }

  inativar(id: number): boolean {
    const item = this.buscarPorId(id)
    if (!item) return false
    item.ativo = false
    return true
  }

  emailEmUso(email: string, idExcluido?: number): boolean {
    return this.itens.some(
      (item) =>
        item.email?.toLowerCase() === email.toLowerCase() && item.id !== idExcluido,
    )
  }
}

function codigoDoErro(acao: () => unknown): CodigoErroDominio {
  try {
    acao()
  } catch (erro) {
    if (erro instanceof ErroDeDominio) {
      expect(erro.message).toBe(erro.codigo)
      return erro.codigo
    }
    throw erro
  }
  throw new Error('Era esperado um erro de domínio')
}

describe('ClienteServico', () => {
  it('cria cliente com e-mail livre e delega a listagem com filtros', () => {
    const repositorio = new RepositorioClientesFalso()
    const servico = new ClienteServico(repositorio)

    expect(servico.criar({ nome: 'Ana', email: 'ana@example.com' })).toMatchObject({
      nome: 'Ana',
      email: 'ana@example.com',
      ativo: true,
    })
    expect(servico.listar({ nome: 'Ana' })).toHaveLength(1)
  })

  it('rejeita e-mail duplicado no cadastro e na atualização, ignorando o próprio id', () => {
    const repositorio = new RepositorioClientesFalso()
    const ana = repositorio.criar({ nome: 'Ana', email: 'ana@example.com' })
    const bruno = repositorio.criar({ nome: 'Bruno', email: 'bruno@example.com' })
    const servico = new ClienteServico(repositorio)

    expect(
      codigoDoErro(() => servico.criar({ nome: 'Outra Ana', email: 'ANA@example.com' })),
    ).toBe('EMAIL_DUPLICADO')
    expect(
      codigoDoErro(() => servico.atualizar({ id: bruno.id, email: 'ana@example.com' })),
    ).toBe('EMAIL_DUPLICADO')
    expect(servico.atualizar({ id: ana.id, email: 'ANA@example.com' }).email).toBe(
      'ANA@example.com',
    )
  })

  it('rejeita busca, atualização e inativação de cliente inexistente', () => {
    const servico = new ClienteServico(new RepositorioClientesFalso())

    expect(codigoDoErro(() => servico.buscarPorId(42))).toBe('CLIENTE_NAO_ENCONTRADO')
    expect(codigoDoErro(() => servico.atualizar({ id: 42, nome: 'X' }))).toBe(
      'CLIENTE_NAO_ENCONTRADO',
    )
    expect(codigoDoErro(() => servico.inativar(42))).toBe('CLIENTE_NAO_ENCONTRADO')
  })

  it('aceita e-mail ausente e permite limpar campos na atualização', () => {
    const repositorio = new RepositorioClientesFalso()
    const servico = new ClienteServico(repositorio)

    const cliente = servico.criar({ nome: 'Sem e-mail', complemento: 'Apto 1' })
    expect(cliente.email).toBeNull()

    const atualizado = servico.atualizar({
      id: cliente.id,
      email: null,
      complemento: null,
      uf: 'SP',
    })
    expect(atualizado).toMatchObject({ email: null, complemento: null, uf: 'SP' })
  })
})
