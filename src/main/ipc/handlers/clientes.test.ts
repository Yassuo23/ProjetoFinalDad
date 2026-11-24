import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type { Cliente, Endereco } from '../../../shared/contratos/modelos'
import type { ServicoCep } from '../../servicos/CepServico'
import type { ServicoClientes } from '../../servicos/ClienteServico'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarClientes } from './clientes'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: Canal, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal não registrado: ${canal}`)
    return ouvinte(undefined, payload)
  }
}

const cliente: Cliente = {
  id: 1,
  nome: 'Ana',
  email: 'ana@example.com',
  telefone: '11999999999',
  cep: '01001000',
  logradouro: 'Praça da Sé',
  numero: '10',
  complemento: null,
  bairro: 'Sé',
  cidade: 'São Paulo',
  uf: 'SP',
  ativo: true,
}

const endereco: Endereco = {
  cep: '01001000',
  logradouro: 'Praça da Sé',
  complemento: 'lado ímpar',
  bairro: 'Sé',
  cidade: 'São Paulo',
  uf: 'SP',
}

function servicosFalsos(): { clientes: ServicoClientes; cep: ServicoCep } {
  return {
    clientes: {
      listar: vi.fn(() => [cliente]),
      buscarPorId: vi.fn(() => cliente),
      criar: vi.fn(() => cliente),
      atualizar: vi.fn(() => cliente),
      inativar: vi.fn(() => undefined),
    },
    cep: { consultar: vi.fn(async () => endereco) },
  }
}

describe('handlers de clientes', () => {
  it('registra os seis canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const { clientes, cep } = servicosFalsos()
    const registro = new RegistroIpc(ipc)
    registrarClientes(registro, clientes, cep)

    expect(registro.total).toBe(6)
    expect(await ipc.invocar(CANAIS.clientesListar, { nome: 'Ana' })).toEqual([cliente])
    expect(await ipc.invocar(CANAIS.clientesBuscarPorId, { id: 1 })).toEqual(cliente)
    expect(await ipc.invocar(CANAIS.clientesCriar, { nome: 'Ana' })).toEqual(cliente)
    expect(await ipc.invocar(CANAIS.clientesAtualizar, { id: 1, nome: 'Ana Lima' })).toEqual(
      cliente,
    )
    await expect(ipc.invocar(CANAIS.clientesInativar, { id: 1 })).resolves.toBeUndefined()
    expect(await ipc.invocar(CANAIS.clientesConsultarCep, { cep: '01001-000' })).toEqual(
      endereco,
    )

    expect(clientes.listar).toHaveBeenCalledWith({ nome: 'Ana' })
    expect(clientes.criar).toHaveBeenCalledWith({ nome: 'Ana' })
    expect(clientes.inativar).toHaveBeenCalledWith(1)
    expect(cep.consultar).toHaveBeenCalledWith('01001-000')
  })

  it('rejeita payload inválido sem vazar detalhe do Zod', async () => {
    const ipc = new RegistradorFalso()
    const { clientes, cep } = servicosFalsos()
    registrarClientes(new RegistroIpc(ipc), clientes, cep)

    const casos: Array<[Canal, unknown]> = [
      [CANAIS.clientesListar, { ativo: 'sim' }],
      [CANAIS.clientesBuscarPorId, { id: -1 }],
      [CANAIS.clientesCriar, { nome: '' }],
      [CANAIS.clientesAtualizar, { id: 1, uf: 'SPP' }],
      [CANAIS.clientesInativar, { id: 0 }],
      [CANAIS.clientesConsultarCep, { cep: '123' }],
    ]
    for (const [canal, payload] of casos) {
      await expect(ipc.invocar(canal, payload)).rejects.toThrow(`IPC_INVALIDO:${canal}`)
    }
    expect(clientes.criar).not.toHaveBeenCalled()
    expect(clientes.atualizar).not.toHaveBeenCalled()
    expect(cep.consultar).not.toHaveBeenCalled()
  })

  it('propaga erro de domínio com o código na mensagem', async () => {
    const ipc = new RegistradorFalso()
    const { clientes, cep } = servicosFalsos()
    vi.mocked(clientes.buscarPorId).mockImplementation(() => {
      throw new ErroDeDominio('CLIENTE_NAO_ENCONTRADO', 'Cliente não encontrado.')
    })
    vi.mocked(cep.consultar).mockImplementation(async () => {
      throw new ErroDeDominio('CEP_NAO_ENCONTRADO', 'CEP não encontrado.')
    })
    registrarClientes(new RegistroIpc(ipc), clientes, cep)

    await expect(ipc.invocar(CANAIS.clientesBuscarPorId, { id: 7 })).rejects.toThrow(
      'CLIENTE_NAO_ENCONTRADO',
    )
    await expect(ipc.invocar(CANAIS.clientesConsultarCep, { cep: '00000000' })).rejects.toThrow(
      'CEP_NAO_ENCONTRADO',
    )
  })
})
