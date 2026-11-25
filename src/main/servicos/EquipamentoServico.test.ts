import { describe, expect, it } from 'vitest'
import { esquemaEquipamentoCriar, esquemaEquipamentoListar } from '../../shared/contratos/esquemas'
import type {
  DisponibilidadeEquipamento,
  Equipamento,
  EquipamentoCriarEntrada,
  EquipamentoAtualizarEntrada,
} from '../../shared/contratos/modelos'
import type { RepositorioEquipamentos, RepositorioFornecedores } from '../repositorios/portas'
import { EquipamentoServico } from './EquipamentoServico'
import { ErroDeDominio } from './ErroDeDominio'
import type { ServicoDisponibilidade } from './portas'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'

function equipamento(disponibilidade: DisponibilidadeEquipamento): Equipamento {
  return {
    id: 7,
    nome: 'Barraca',
    categoria: 'Camping',
    estadoConservacao: 'Bom',
    disponibilidade,
    fornecedorId: null,
    valorDiaria: 39.9,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function montar() {
  const criados: EquipamentoCriarEntrada[] = []
  const atualizados: EquipamentoAtualizarEntrada[] = []
  const repositorio: RepositorioEquipamentos = {
    listar: async () => [equipamento('Disponível')],
    buscarPorId: async () => equipamento('Disponível'),
    criar: async (dados) => {
      criados.push(dados)
      return {
        ...equipamento(dados.disponibilidade ?? 'Disponível'),
        valorDiaria: dados.valorDiaria ?? 0,
      }
    },
    atualizar: async (dados) => {
      atualizados.push(dados)
      return {
        ...equipamento(dados.disponibilidade ?? 'Disponível'),
        valorDiaria: dados.valorDiaria ?? 39.9,
      }
    },
    inativar: async () => true,
    listarDisponiveis: async () => [],
    nomeEmUso: async () => false,
  }
  const fornecedores: RepositorioFornecedores = {
    listar: async () => [],
    buscarPorId: async () => null,
    criar: async () => {
      throw new Error('Não usado neste teste.')
    },
    atualizar: async () => null,
    inativar: async () => false,
    cnpjEmUso: async () => false,
  }
  const disponibilidade: ServicoDisponibilidade = {
    listarDisponiveis: async () => [equipamento('Disponível')],
    validarItens: async () => undefined,
  }
  return {
    servico: new EquipamentoServico(repositorio, fornecedores, disponibilidade),
    criados,
    atualizados,
  }
}

describe('EquipamentoServico — disponibilidade', () => {
  it('aplica o default na criação sem campo', async () => {
    const { servico, criados } = montar()

    await servico.criar({ nome: 'Barraca', categoria: 'Camping', estadoConservacao: 'Bom' })

    expect(criados[0]?.disponibilidade).toBe('Disponível')
  })

  it('preserva o valor informado na criação e na atualização', async () => {
    const { servico, criados, atualizados } = montar()

    await servico.criar({
      nome: 'Barraca',
      categoria: 'Camping',
      estadoConservacao: 'Bom',
      disponibilidade: 'Em manutenção',
    })
    await servico.atualizar({ id: 7, disponibilidade: 'Indisponível' })

    expect(criados[0]?.disponibilidade).toBe('Em manutenção')
    expect(atualizados[0]?.disponibilidade).toBe('Indisponível')
  })

  it('não envia disponibilidade na atualização quando o campo é omitido', async () => {
    const { servico, atualizados } = montar()

    await servico.atualizar({ id: 7, nome: 'Barraca nova' })

    expect(atualizados[0]).not.toHaveProperty('disponibilidade')
  })
})

describe('schemas de equipamento — disponibilidade', () => {
  it('aceita chamadas antigas com default Disponível', () => {
    const dados = esquemaEquipamentoCriar.parse({
      nome: 'Barraca',
      categoria: 'Camping',
      estadoConservacao: 'Bom',
    })

    expect(dados.disponibilidade).toBe('Disponível')
  })

  it('rejeita valores fora do domínio no criar, atualizar e listar', () => {
    const base = {
      nome: 'Barraca',
      categoria: 'Camping',
      estadoConservacao: 'Bom',
      disponibilidade: 'Quebrado',
    }

    expect(() => esquemaEquipamentoCriar.parse(base)).toThrow()
    expect(() =>
      esquemaEquipamentoCriar.parse({ ...base, disponibilidade: 'Em Manutenção' }),
    ).toThrow()
    expect(() => esquemaEquipamentoListar.parse({ disponibilidade: 'Quebrado' })).toThrow()
  })
})

describe('EquipamentoServico — valorDiaria', () => {
  it('devolve a diária na leitura, inclusive nos disponíveis', async () => {
    const { servico } = montar()

    await expect(servico.listar()).resolves.toMatchObject([{ valorDiaria: 39.9 }])
    await expect(servico.buscarPorId(7)).resolves.toMatchObject({ valorDiaria: 39.9 })
    await expect(
      servico.listarDisponiveis({ dataInicio: '2026-02-10', dataFim: '2026-02-12' }),
    ).resolves.toMatchObject([{ valorDiaria: 39.9 }])
  })

  it('aplica o default 0 na criação quando o campo é omitido', async () => {
    const { servico, criados } = montar()

    await servico.criar({ nome: 'Barraca', categoria: 'Camping', estadoConservacao: 'Bom' })

    expect(criados[0]?.valorDiaria).toBe(0)
  })

  it('preserva a diária informada na criação e na atualização', async () => {
    const { servico, criados, atualizados } = montar()

    await servico.criar({
      nome: 'Barraca',
      categoria: 'Camping',
      estadoConservacao: 'Bom',
      valorDiaria: 49.9,
    })
    await servico.atualizar({ id: 7, valorDiaria: 55.5 })

    expect(criados[0]?.valorDiaria).toBe(49.9)
    expect(atualizados[0]?.valorDiaria).toBe(55.5)
  })

  it('não envia a diária na atualização quando o campo é omitido', async () => {
    const { servico, atualizados } = montar()

    await servico.atualizar({ id: 7, nome: 'Barraca nova' })

    expect(atualizados[0]).not.toHaveProperty('valorDiaria')
  })

  it('rejeita diária negativa com DADOS_INVALIDOS sem chegar ao repositório', async () => {
    const { servico, criados, atualizados } = montar()

    await expect(
      servico.criar({
        nome: 'Barraca',
        categoria: 'Camping',
        estadoConservacao: 'Bom',
        valorDiaria: -1,
      }),
    ).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
      mensagem: 'A diária do equipamento deve ser um número não negativo.',
    })
    await expect(servico.atualizar({ id: 7, valorDiaria: -0.01 })).rejects.toBeInstanceOf(
      ErroDeDominio,
    )
    expect(criados).toEqual([])
    expect(atualizados).toEqual([])
  })

  it('rejeita diária não finita com DADOS_INVALIDOS', async () => {
    const { servico } = montar()

    await expect(
      servico.criar({
        nome: 'Barraca',
        categoria: 'Camping',
        estadoConservacao: 'Bom',
        valorDiaria: Number.POSITIVE_INFINITY,
      }),
    ).rejects.toMatchObject({ codigo: 'DADOS_INVALIDOS' })
  })
})
