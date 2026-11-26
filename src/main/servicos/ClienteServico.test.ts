import { describe, expect, it } from 'vitest'
import type {
  Cliente,
  ClienteAtualizarEntrada,
  ClienteCriarEntrada,
  ClienteListarFiltros,
  RespostaCep,
} from '../../shared/contratos/modelos'
import type { RepositorioClientes } from '../repositorios/portas'
import { ClienteServico } from './ClienteServico'
import type { ServicoCep } from './portas'

const AUDITORIA = '2026-01-01T00:00:00.000Z'

const DISPONIVEL: RespostaCep = {
  estado: 'disponivel',
  endereco: {
    cep: '01001000',
    logradouro: 'Praça da Sé',
    bairro: 'Centro',
    cidade: 'São Paulo',
    uf: 'SP',
  },
}
const FALHAS: readonly RespostaCep[] = [
  { estado: 'nao-encontrado', cep: '00000000' },
  { estado: 'indisponivel', cep: '01001000', motivo: 'SERVICO_FORA' },
]

function clienteDosDados(dados: ClienteCriarEntrada): Cliente {
  return {
    id: 1,
    nome: dados.nome,
    cpf: dados.cpf,
    telefone: dados.telefone ?? null,
    email: dados.email ?? null,
    cep: dados.cep ?? null,
    logradouro: dados.logradouro ?? null,
    numero: dados.numero ?? null,
    complemento: dados.complemento ?? null,
    bairro: dados.bairro ?? null,
    cidade: dados.cidade ?? null,
    uf: dados.uf ?? null,
    ativo: true,
    atualizadoEm: AUDITORIA,
  }
}

class RepositorioFalso implements RepositorioClientes {
  readonly criados: ClienteCriarEntrada[] = []

  async listar(
    _filtros?: ClienteListarFiltros,
    _idClienteProprietario?: number,
  ): Promise<readonly Cliente[]> {
    return []
  }

  async buscarPorId(_id: number, _idClienteProprietario?: number): Promise<Cliente | null> {
    return null
  }

  async criar(dados: ClienteCriarEntrada): Promise<Cliente> {
    this.criados.push(dados)
    return clienteDosDados(dados)
  }

  async atualizar(
    _dados: ClienteAtualizarEntrada,
    _idClienteProprietario?: number,
  ): Promise<Cliente | null> {
    return null
  }

  async inativar(_id: number): Promise<boolean> {
    return false
  }

  async cpfEmUso(_cpf: string, _idExcluido?: number): Promise<boolean> {
    return false
  }
}

class CepFalso implements ServicoCep {
  constructor(private readonly resposta: RespostaCep) {}

  async buscar(_cep: string): Promise<RespostaCep> {
    return this.resposta
  }
}

describe('ClienteServico — contrato público de CEP', () => {
  it('repassa os três estados sem converter em ErroDeDominio', async () => {
    const respostas: readonly RespostaCep[] = [...FALHAS, DISPONIVEL]
    for (const resposta of respostas) {
      const servico = new ClienteServico(new RepositorioFalso(), new CepFalso(resposta))
      expect(await servico.buscarCep('01001000')).toEqual(resposta)
    }
  })

  it('ao salvar, preenche os quatro campos somente com endereço disponível', async () => {
    const repositorio = new RepositorioFalso()
    const servico = new ClienteServico(repositorio, new CepFalso(DISPONIVEL))

    await servico.criar({ nome: 'Ana', cpf: '52998224725', cep: '01001000' })

    expect(repositorio.criados[0]).toMatchObject({
      logradouro: 'Praça da Sé',
      bairro: 'Centro',
      cidade: 'São Paulo',
      uf: 'SP',
    })
  })

  it('ao salvar com falha, preserva o que foi digitado e não inventa endereço', async () => {
    for (const resposta of FALHAS) {
      const repositorio = new RepositorioFalso()
      const servico = new ClienteServico(repositorio, new CepFalso(resposta))

      await servico.criar({
        nome: 'Ana',
        cpf: '52998224725',
        cep: '01001000',
        logradouro: 'Rua digitada',
      })

      expect(repositorio.criados[0]).toEqual({
        nome: 'Ana',
        cpf: '52998224725',
        cep: '01001000',
        logradouro: 'Rua digitada',
      })
    }
  })
})
