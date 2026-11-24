import { describe, expect, it, vi } from 'vitest'
import { CANAIS } from '../../../shared/contratos/canais'
import type { ExportacaoCsvEntrada, ResultadoDialogo } from '../../../shared/contratos/modelos'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import type { ServicoExportacao } from '../../servicos/ExportacaoServico'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarExportacao } from './exportacao'

type Ouvinte = (evento: unknown, ...argumentos: unknown[]) => unknown

class RegistradorFalso implements RegistradorIpc {
  private readonly ouvintes = new Map<string, Ouvinte>()

  handle(canal: string, ouvinte: Ouvinte): void {
    this.ouvintes.set(canal, ouvinte)
  }

  async invocar(canal: string, payload?: unknown): Promise<unknown> {
    const ouvinte = this.ouvintes.get(canal)
    if (!ouvinte) throw new Error(`Canal não registrado: ${canal}`)
    return ouvinte(undefined, payload)
  }
}

const ENTRADA: ExportacaoCsvEntrada = {
  titulo: 'Relatório',
  nomeSugerido: 'relatorio.csv',
  cabecalhos: ['Equipamento', 'Valor'],
  linhas: [['Tenda', 250]],
}

function servicoFalso() {
  const csv = vi.fn(async (_entrada: ExportacaoCsvEntrada): Promise<ResultadoDialogo> => ({
    caminho: '/downloads/relatorio.csv',
  }))
  const servico: ServicoExportacao = { csv }
  return { servico, csv }
}

describe('handlers de exportação', () => {
  it('registra o canal e delega a entrada validada', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    registrarExportacao(new RegistroIpc(ipc), falso.servico)

    expect(await ipc.invocar(CANAIS.exportacaoCsv, ENTRADA)).toEqual({
      caminho: '/downloads/relatorio.csv',
    })
    expect(falso.csv).toHaveBeenCalledWith(ENTRADA)
  })

  it('rejeita entrada inválida com IPC_INVALIDO do canal', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    registrarExportacao(new RegistroIpc(ipc), falso.servico)

    const casos: readonly unknown[] = [
      {},
      { ...ENTRADA, cabecalhos: [] },
      { ...ENTRADA, linhas: [['Tenda']] },
      { ...ENTRADA, linhas: [['Tenda', Number.NaN]] },
      { ...ENTRADA, nomeSugerido: '../fora.csv' },
    ]
    for (const payload of casos) {
      await expect(ipc.invocar(CANAIS.exportacaoCsv, payload)).rejects.toThrow(
        `IPC_INVALIDO:${CANAIS.exportacaoCsv}`,
      )
    }
    expect(falso.csv).not.toHaveBeenCalled()
  })

  it('propaga EXPORTACAO_FALHOU sem transformar o erro', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    falso.csv.mockRejectedValueOnce(
      new ErroDeDominio('EXPORTACAO_FALHOU', 'Não foi possível exportar o CSV.'),
    )
    registrarExportacao(new RegistroIpc(ipc), falso.servico)

    await expect(ipc.invocar(CANAIS.exportacaoCsv, ENTRADA)).rejects.toThrow('EXPORTACAO_FALHOU')
  })

  it('devolve cancelamento do serviço como resposta normal', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    falso.csv.mockResolvedValueOnce({ caminho: null })
    registrarExportacao(new RegistroIpc(ipc), falso.servico)

    expect(await ipc.invocar(CANAIS.exportacaoCsv, ENTRADA)).toEqual({ caminho: null })
  })
})
