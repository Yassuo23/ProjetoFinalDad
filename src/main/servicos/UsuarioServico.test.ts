import { describe, expect, it } from 'vitest'
import type { Sessao, Usuario } from '../../shared/contratos/modelos'
import type { RepositorioUsuarios } from '../repositorios/portas'
import { UsuarioServico } from './UsuarioServico'
import type { GestorSessao } from './portas'

const ATUALIZADO = '2026-01-01T00:00:00.000Z'

function usuario(id: number, ativo = true): Usuario {
  return {
    id,
    nome: `Usuário ${id}`,
    login: `usuario${id}`,
    senhaHash: 'scrypt$nao$exibir',
    perfil: 'Atendente',
    ativo,
    atualizadoEm: ATUALIZADO,
  }
}

function repositorio(atualizar: (dados: { id: number; ativo?: boolean }) => Promise<Usuario | null>) {
  return {
    listar: async () => [usuario(1)],
    buscarPorId: async (id: number) => (id === 1 || id === 2 ? usuario(id) : null),
    buscarPorCpf: async () => null,
    loginEmUso: async () => false,
    criar: async () => {
      throw new Error('não usado')
    },
    atualizar,
    atualizarSenha: async () => true,
  } as unknown as RepositorioUsuarios
}

function sessao(usuarioId: number | null): GestorSessao {
  const atual: Sessao | null =
    usuarioId === null
      ? null
      : {
          usuarioId,
          nome: 'Admin',
          login: 'admin',
          perfil: 'Administrador',
          clienteId: null,
        }
  return {
    sessao: () => atual,
    atualizarSessao: () => undefined,
  }
}

describe('UsuarioServico — CRUD administrativo', () => {
  it('busca por id sem devolver senhaHash', async () => {
    const servico = new UsuarioServico(repositorio(async () => null), sessao(1))

    const encontrado = await servico.buscarPorId(1)

    expect(encontrado).not.toHaveProperty('senhaHash')
    expect(encontrado).toMatchObject({ id: 1, login: 'usuario1' })
  })

  it('inativa outro usuário', async () => {
    const atualizar = async (dados: { id: number; ativo?: boolean }) => usuario(dados.id, false)
    const servico = new UsuarioServico(repositorio(atualizar), sessao(1))

    await expect(servico.inativar(2)).resolves.toBeUndefined()
  })

  it('impede que o administrador inative a própria conta', async () => {
    const servico = new UsuarioServico(repositorio(async () => null), sessao(1))

    await expect(servico.inativar(1)).rejects.toMatchObject({
      codigo: 'DADOS_INVALIDOS',
      mensagem: expect.stringContaining('próprio usuário'),
    })
  })

  it('rejeita id inexistente', async () => {
    const servico = new UsuarioServico(repositorio(async () => null), sessao(1))

    await expect(servico.buscarPorId(99)).rejects.toMatchObject({ codigo: 'NAO_ENCONTRADO' })
  })
})
