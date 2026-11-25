import { describe, expect, it } from 'vitest'
import {
  esquemaEquipamentoCriar,
  esquemaEquipamentoListar,
} from '../../shared/contratos/esquemas'
import type {
  DisponibilidadeEquipamento,
  Equipamento,
  EquipamentoCriarEntrada,
  EquipamentoAtualizarEntrada,
} from '../../shared/contratos/modelos'
import type {
  RepositorioEquipamentos,
  RepositorioFornecedores,
} from '../repositorios/portas'
import { EquipamentoServico } from './EquipamentoServico'
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
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function montar() {
  const criados: EquipamentoCriarEntrada[] = []
  const atualizados: EquipamentoAtualizarEntrada[] = []
  const repositorio: RepositorioEquipamentos = {
    listar: async () => [],
    buscarPorId: async () => equipamento('Disponível'),
    criar: async (dados) => {
      criados.push(dados)
      return equipamento(dados.disponibilidade ?? 'Disponível')
    },
    atualizar: async (dados) => {
      atualizados.push(dados)
      return equipamento(dados.disponibilidade ?? 'Disponível')
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
    listarDisponiveis: async () => [],
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
