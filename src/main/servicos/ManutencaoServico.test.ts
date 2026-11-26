import { describe, expect, it, vi } from 'vitest'
import type {
  Equipamento,
  Fornecedor,
  OrdemManutencao,
} from '../../shared/contratos/modelos'
import type {
  EfeitosManutencao,
  RepositorioEquipamentos,
  RepositorioFornecedores,
  RepositorioManutencoes,
} from '../repositorios/portas'
import { ManutencaoServico } from './ManutencaoServico'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'

function ordem(status: OrdemManutencao['status'] = 'Aberta'): OrdemManutencao {
  return {
    id: 3,
    equipamentoId: 9,
    fornecedorId: null,
    descricao: 'Revisão dos freios',
    dataEnvio: '2026-01-10',
    dataRetornoPrevista: '2026-01-14',
    dataRetorno: null,
    custo: null,
    status,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function equipamento(): Equipamento {
  return {
    id: 9,
    nome: 'Bicicleta Gravel',
    categoria: 'Bicicleta',
    estadoConservacao: 'Bom',
    disponibilidade: 'Disponível',
    fornecedorId: null,
    valorDiaria: 90,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function fornecedor(): Fornecedor {
  return {
    id: 4,
    nome: 'Trail Norte',
    cnpj: '11222333000144',
    telefone: null,
    email: null,
    tipo: 'Manutenção',
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function repositorioEquipamentos(existe = true): RepositorioEquipamentos {
  return {
    listar: async () => [],
    buscarPorId: async () => (existe ? equipamento() : null),
    criar: async () => {
      throw new Error('não usado no teste')
    },
    atualizar: async () => null,
    inativar: async () => true,
    listarDisponiveis: async () => [],
    nomeEmUso: async () => false,
  }
}

function repositorioFornecedores(): RepositorioFornecedores {
  return {
    listar: async () => [],
    buscarPorId: async () => fornecedor(),
    criar: async () => {
      throw new Error('não usado no teste')
    },
    atualizar: async () => null,
    inativar: async () => true,
    cnpjEmUso: async () => false,
  }
}

function repositorioManutencoes(status: OrdemManutencao['status'] = 'Aberta') {
  const atual = ordem(status)
  return {
    listar: vi.fn(async () => [atual]),
    buscarPorId: vi.fn(async () => atual),
    criarComEfeitos: vi.fn(
      async (dados: Parameters<RepositorioManutencoes['criarComEfeitos']>[0], _efeitos: EfeitosManutencao) =>
        ({ ...atual, ...dados, id: 10 }) as OrdemManutencao,
    ),
    atualizar: vi.fn(async (dados: Parameters<RepositorioManutencoes['atualizar']>[0]) => ({
      ...atual,
      ...dados,
    })) as RepositorioManutencoes['atualizar'],
    concluirComEfeitos: vi.fn(
      async (
        dados: Parameters<RepositorioManutencoes['concluirComEfeitos']>[0],
        _efeitos: EfeitosManutencao,
      ) =>
        ({
          ...atual,
          status: 'Concluída',
          dataRetorno: dados.dataRetorno,
          custo: dados.custo ?? null,
        }) as OrdemManutencao,
    ),
    inativar: vi.fn(async () => true),
  } satisfies RepositorioManutencoes
}

function servico(status: OrdemManutencao['status'] = 'Aberta', equipamentoExiste = true) {
  return new ManutencaoServico(
    repositorioManutencoes(status),
    repositorioEquipamentos(equipamentoExiste),
    repositorioFornecedores(),
  )
}

describe('ManutencaoServico', () => {
  it('envia o equipamento para manutenção ao abrir a ordem', async () => {
    const repositorio = repositorioManutencoes()
    const servicoAberto = new ManutencaoServico(
      repositorio,
      repositorioEquipamentos(),
      repositorioFornecedores(),
    )

    await servicoAberto.criar({
      equipamentoId: 9,
      descricao: 'Troca de pneus',
      dataEnvio: '2026-01-10',
    })

    expect(repositorio.criarComEfeitos).toHaveBeenCalledWith(expect.any(Object), {
      estadoConservacao: 'Em Manutenção',
      disponibilidade: 'Em manutenção',
    })
  })

  it('restaura conservação e disponibilidade ao concluir', async () => {
    const repositorio = repositorioManutencoes()
    const servicoAtual = new ManutencaoServico(
      repositorio,
      repositorioEquipamentos(),
      repositorioFornecedores(),
    )

    const concluida = await servicoAtual.concluir({
      id: 3,
      dataRetorno: '2026-01-15',
      custo: 120,
    })

    expect(repositorio.concluirComEfeitos).toHaveBeenCalledWith(
      { id: 3, dataRetorno: '2026-01-15', custo: 120 },
      { estadoConservacao: 'Bom', disponibilidade: 'Disponível' },
    )
    expect(concluida.status).toBe('Concluída')
  })

  it('rejeita retorno previsto anterior ao envio', async () => {
    await expect(
      servico().criar({
        equipamentoId: 9,
        descricao: 'Revisão',
        dataEnvio: '2026-01-10',
        dataRetornoPrevista: '2026-01-09',
      }),
    ).rejects.toMatchObject({ codigo: 'PERIODO_INVALIDO' })
  })

  it('rejeita ordem para equipamento inexistente', async () => {
    await expect(
      servico('Aberta', false).criar({
        equipamentoId: 99,
        descricao: 'Revisão',
        dataEnvio: '2026-01-10',
      }),
    ).rejects.toMatchObject({ codigo: 'RELACAO_INVALIDA' })
  })

  it('rejeita concluir uma ordem já concluída', async () => {
    await expect(servico('Concluída').concluir({ id: 3 })).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
    })
  })
})
