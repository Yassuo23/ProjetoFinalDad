import { describe, expect, it } from 'vitest'
import type { DisponibilidadeEquipamento, Equipamento } from '../../shared/contratos/modelos'
import type { RepositorioEquipamentos } from '../repositorios/portas'
import { DisponibilidadeServico } from './DisponibilidadeServico'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'

function equipamento(
  id: number,
  disponibilidade: DisponibilidadeEquipamento = 'Disponível',
): Equipamento {
  return {
    id,
    nome: `Equipamento ${id}`,
    categoria: 'Bicicleta',
    estadoConservacao: 'Bom',
    disponibilidade,
    fornecedorId: null,
    ativo: true,
    atualizadoEm: ATUALIZADO,
  }
}

function repositorio(disponiveis: readonly Equipamento[]): RepositorioEquipamentos {
  return {
    listar: async () => disponiveis,
    buscarPorId: async () => null,
    criar: async () => equipamento(1),
    atualizar: async () => null,
    inativar: async () => false,
    listarDisponiveis: async () => disponiveis,
    nomeEmUso: async () => false,
  }
}

const periodo = { dataInicio: '2026-02-10', dataFim: '2026-02-12' }

describe('DisponibilidadeServico', () => {
  it('aceita itens que estão na lista de disponíveis', async () => {
    const servico = new DisponibilidadeServico(repositorio([equipamento(1), equipamento(2)]))

    await expect(servico.validarItens([{ equipamentoId: 1 }], periodo)).resolves.toBeUndefined()
  })

  it('rejeita equipamento indisponível com código estável', async () => {
    const servico = new DisponibilidadeServico(repositorio([equipamento(1)]))

    await expect(servico.validarItens([{ equipamentoId: 9 }], periodo)).rejects.toMatchObject({
      codigo: 'EQUIPAMENTO_INDISPONIVEL',
    })
  })

  it('não aceita itens marcados como indisponíveis ou em manutenção', async () => {
    const todos = [
      equipamento(1),
      equipamento(2, 'Indisponível'),
      equipamento(3, 'Em manutenção'),
    ]
    const servico = new DisponibilidadeServico({
      ...repositorio([]),
      // Espelha o filtro que o repositório aplica em `e.disponibilidade`.
      listarDisponiveis: async () =>
        todos.filter((item) => item.disponibilidade === 'Disponível'),
    })

    await expect(servico.validarItens([{ equipamentoId: 1 }], periodo)).resolves.toBeUndefined()
    await expect(
      servico.validarItens([{ equipamentoId: 2 }, { equipamentoId: 3 }], periodo),
    ).rejects.toMatchObject({ codigo: 'EQUIPAMENTO_INDISPONIVEL' })
  })

  it('rejeita período invertido antes de consultar o banco', async () => {
    const servico = new DisponibilidadeServico(repositorio([equipamento(1)]))

    await expect(
      servico.validarItens([{ equipamentoId: 1 }], {
        dataInicio: '2026-02-12',
        dataFim: '2026-02-10',
      }),
    ).rejects.toMatchObject({ codigo: 'PERIODO_INVALIDO' })
  })
})
