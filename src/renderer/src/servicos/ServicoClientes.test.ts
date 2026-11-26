import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RespostaCep } from '../../../shared/contratos/modelos'
import { ServicoClientes } from './ServicoClientes'

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
const NAO_ENCONTRADO: RespostaCep = { estado: 'nao-encontrado', cep: '00000000' }
const INDISPONIVEL: RespostaCep = {
  estado: 'indisponivel',
  cep: '01001000',
  motivo: 'SERVICO_FORA',
}

function instalarFachada(buscarCep: (cep: string) => Promise<RespostaCep>): void {
  vi.stubGlobal('window', { electronAPI: { clientes: { buscarCep } } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ServicoClientes.buscarCep — fachada do renderer', () => {
  it('devolve o estado disponivel sem conhecer URL, host ou status', async () => {
    const buscarCep = vi.fn(async () => DISPONIVEL)
    instalarFachada(buscarCep)

    expect(await new ServicoClientes().buscarCep('01001-000')).toEqual(DISPONIVEL)
    expect(buscarCep).toHaveBeenCalledWith('01001-000')
  })

  it('devolve nao-encontrado como valor, sem transformar em exceção', async () => {
    const buscarCep = vi.fn(async () => NAO_ENCONTRADO)
    instalarFachada(buscarCep)

    expect(await new ServicoClientes().buscarCep('00000-000')).toEqual(NAO_ENCONTRADO)
    expect(buscarCep).toHaveBeenCalledTimes(1)
  })

  it('devolve indisponivel com motivo como valor, preservando o fallback manual', async () => {
    const buscarCep = vi.fn(async () => INDISPONIVEL)
    instalarFachada(buscarCep)

    const resultado = await new ServicoClientes().buscarCep('01001-000')
    expect(resultado).toEqual(INDISPONIVEL)
    expect(resultado).toMatchObject({ estado: 'indisponivel', motivo: 'SERVICO_FORA' })
    expect(buscarCep).toHaveBeenCalledTimes(1)
  })
})
