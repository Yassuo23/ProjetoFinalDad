import { describe, expect, it, vi } from 'vitest'
import { CANAIS, type Canal } from '../../../shared/contratos/canais'
import type {
  DialogoAbrirEntrada,
  DialogoSalvarEntrada,
  ResultadoDialogo,
} from '../../../shared/contratos/modelos'
import type { ServicoArquivos } from '../../servicos/ArquivosServico'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import { RegistroIpc, type RegistradorIpc } from '../RegistroIpc'
import { registrarArquivos } from './arquivos'

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

function servicoFalso() {
  const abrir = vi.fn(
    async (_entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo> => ({
      caminho: '/documentos/backup.db',
    }),
  )
  const salvar = vi.fn(
    async (_entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo> => ({
      caminho: '/downloads/relatorio.csv',
    }),
  )
  const servico: ServicoArquivos = { abrir, salvar }
  return { servico, abrir, salvar }
}

describe('handlers de arquivos', () => {
  it('registra os dois canais e delega payloads válidos', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    registrarArquivos(new RegistroIpc(ipc), falso.servico)
    const abrir: DialogoAbrirEntrada = {
      titulo: 'Escolher backup',
      filtros: [{ nome: 'Banco', extensoes: ['.db'] }],
    }
    const salvar: DialogoSalvarEntrada = { nomeSugerido: 'relatorio.csv' }

    expect(await ipc.invocar(CANAIS.arquivosAbrir, abrir)).toEqual({
      caminho: '/documentos/backup.db',
    })
    expect(await ipc.invocar(CANAIS.arquivosSalvar, salvar)).toEqual({
      caminho: '/downloads/relatorio.csv',
    })
    expect(falso.abrir).toHaveBeenCalledWith(abrir)
    expect(falso.salvar).toHaveBeenCalledWith(salvar)
  })

  it('rejeita payloads fora do contrato com IPC_INVALIDO do canal', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    registrarArquivos(new RegistroIpc(ipc), falso.servico)

    const casos: readonly [Canal, unknown][] = [
      [CANAIS.arquivosAbrir, { titulo: '' }],
      [CANAIS.arquivosAbrir, { filtros: [{ nome: 'Banco', extensoes: ['.exe'] }] }],
      [CANAIS.arquivosSalvar, { nomeSugerido: '../fora.db' }],
    ]
    for (const [canal, payload] of casos) {
      await expect(ipc.invocar(canal, payload)).rejects.toThrow(`IPC_INVALIDO:${canal}`)
    }
    expect(falso.abrir).not.toHaveBeenCalled()
    expect(falso.salvar).not.toHaveBeenCalled()
  })

  it('propaga DIALOGO_FALHOU sem transformar o erro', async () => {
    const ipc = new RegistradorFalso()
    const falso = servicoFalso()
    falso.abrir.mockRejectedValueOnce(
      new ErroDeDominio('DIALOGO_FALHOU', 'Não foi possível abrir o diálogo.'),
    )
    registrarArquivos(new RegistroIpc(ipc), falso.servico)

    await expect(ipc.invocar(CANAIS.arquivosAbrir, {})).rejects.toThrow('DIALOGO_FALHOU')
  })
})
