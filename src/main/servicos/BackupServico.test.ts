import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DialogoSalvarEntrada, ResultadoDialogo } from '../../shared/contratos/modelos'
import {
  BackupServico,
  type PortaArquivosBackup,
  type PortaCicloBancoServico,
} from './BackupServico'
import { ErroDeDominio } from './ErroDominio'

const CAMINHO_BANCO = '/dados/zenite/zenite.db'

function cicloFalso() {
  const caminhoArquivo = vi.fn(() => CAMINHO_BANCO)
  const prepararCopia = vi.fn(() => undefined)
  const fechar = vi.fn(() => undefined)
  const solicitarReabertura = vi.fn(() => undefined)
  const porta: PortaCicloBancoServico = {
    caminhoArquivo,
    prepararCopia,
    fechar,
    solicitarReabertura,
  }
  return { porta, caminhoArquivo, prepararCopia, fechar, solicitarReabertura }
}

function arquivosFalso() {
  const salvar = vi.fn(async (_entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo> => ({
    caminho: null,
  }))
  const confirmar = vi.fn(async (_mensagem: string): Promise<boolean> => true)
  const copiar = vi.fn(async (_origem: string, _destino: string): Promise<number> => 2048)
  const porta: PortaArquivosBackup = { salvar, confirmar, copiar }
  return { porta, salvar, confirmar, copiar }
}

let raiz: string
let fora: string
let diretorios: string[]

beforeEach(() => {
  raiz = mkdtempSync(path.join(tmpdir(), 'zenite-backup-'))
  fora = mkdtempSync(path.join(tmpdir(), 'zenite-fora-'))
  diretorios = ['documentos', 'downloads', 'userData'].map((nome) => {
    const diretorio = path.join(raiz, nome)
    mkdirSync(diretorio)
    return diretorio
  })
})

afterEach(() => {
  vi.useRealTimers()
  rmSync(raiz, { recursive: true, force: true })
  rmSync(fora, { recursive: true, force: true })
})

describe('BackupServico — criar', () => {
  it('devolve cancelamento sem copiar quando o diálogo é cancelado', async () => {
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    expect(await servico.criar()).toEqual({ caminho: null, bytes: 0 })
    expect(arquivos.salvar).toHaveBeenCalledTimes(1)
    expect(ciclo.prepararCopia).not.toHaveBeenCalled()
    expect(arquivos.copiar).not.toHaveBeenCalled()
  })

  it('sugere nome com data/hora, checkpoint e copia o banco para o destino', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 10, 23, 14, 5, 0))
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    const destino = path.join(diretorios[1] ?? '', 'backup.db')
    arquivos.salvar.mockResolvedValueOnce({ caminho: destino })
    arquivos.copiar.mockResolvedValueOnce(4096)
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    expect(await servico.criar()).toEqual({ caminho: destino, bytes: 4096 })
    expect(arquivos.salvar).toHaveBeenCalledWith({
      titulo: expect.any(String),
      nomeSugerido: 'zenite-20261123-1405.db',
      filtros: [{ nome: expect.any(String), extensoes: ['.db'] }],
    })
    expect(ciclo.prepararCopia).toHaveBeenCalledTimes(1)
    expect(arquivos.copiar).toHaveBeenCalledWith(CAMINHO_BANCO, destino)
  })

  it('converte falha de cópia em BACKUP_FALHOU sem detalhe do sistema', async () => {
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    arquivos.salvar.mockResolvedValueOnce({ caminho: path.join(diretorios[0] ?? '', 'a.db') })
    arquivos.copiar.mockRejectedValueOnce(new Error('disk full / erro interno do driver'))
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    const promessa = servico.criar()
    await expect(promessa).rejects.toBeInstanceOf(ErroDeDominio)
    await expect(promessa).rejects.toMatchObject({
      codigo: 'BACKUP_FALHOU',
      message: 'BACKUP_FALHOU',
      mensagem: expect.not.stringContaining('disk full'),
    })
  })
})

describe('BackupServico — restaurar', () => {
  it('confirma, fecha, copia e pede reabertura em ordem', async () => {
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    const subdiretorio = path.join(diretorios[0] ?? '', 'arquivos')
    mkdirSync(subdiretorio)
    const origem = path.join(subdiretorio, 'BACKUP.DB')
    writeFileSync(origem, 'dados do backup')
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    expect(await servico.restaurar({ caminho: origem })).toEqual({
      caminho: origem,
      bytes: 2048,
    })
    expect(arquivos.confirmar).toHaveBeenCalledTimes(1)
    expect(arquivos.copiar).toHaveBeenCalledWith(origem, CAMINHO_BANCO)
    expect(ciclo.fechar).toHaveBeenCalledTimes(1)
    expect(ciclo.solicitarReabertura).toHaveBeenCalledTimes(1)
    expect(ciclo.fechar.mock.invocationCallOrder[0]).toBeLessThan(
      arquivos.copiar.mock.invocationCallOrder[0] ?? 0,
    )
    expect(arquivos.copiar.mock.invocationCallOrder[0]).toBeLessThan(
      ciclo.solicitarReabertura.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('recusa caminho fora dos diretórios permitidos', async () => {
    const origem = path.join(fora, 'outro.db')
    writeFileSync(origem, 'outro banco')
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    await expect(servico.restaurar({ caminho: origem })).rejects.toMatchObject({
      codigo: 'CAMINHO_NAO_PERMITIDO',
    })
    expect(arquivos.confirmar).not.toHaveBeenCalled()
    expect(arquivos.copiar).not.toHaveBeenCalled()
  })

  it('recusa extensão diferente de .db', async () => {
    const origem = path.join(diretorios[0] ?? '', ' backup.txt')
    writeFileSync(origem, 'texto')
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    await expect(servico.restaurar({ caminho: origem })).rejects.toMatchObject({
      codigo: 'CAMINHO_NAO_PERMITIDO',
    })
  })

  it('informa arquivo inexistente dentro de diretório permitido', async () => {
    const origem = path.join(diretorios[2] ?? '', 'inexistente.db')
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    await expect(servico.restaurar({ caminho: origem })).rejects.toMatchObject({
      codigo: 'ARQUIVO_NAO_ENCONTRADO',
    })
    expect(arquivos.confirmar).not.toHaveBeenCalled()
  })

  it('cancela sem tocar no banco quando a confirmação é recusada', async () => {
    const origem = path.join(diretorios[0] ?? '', 'backup.db')
    writeFileSync(origem, 'dados do backup')
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    arquivos.confirmar.mockResolvedValueOnce(false)
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    expect(await servico.restaurar({ caminho: origem })).toEqual({ caminho: null, bytes: 0 })
    expect(ciclo.fechar).not.toHaveBeenCalled()
    expect(arquivos.copiar).not.toHaveBeenCalled()
    expect(ciclo.solicitarReabertura).not.toHaveBeenCalled()
  })

  it('pede reabertura e devolve BACKUP_FALHOU quando a cópia falha após fechar', async () => {
    const origem = path.join(diretorios[1] ?? '', 'backup.db')
    writeFileSync(origem, 'dados do backup')
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    arquivos.copiar.mockRejectedValueOnce(new Error('erro de disco'))
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    await expect(servico.restaurar({ caminho: origem })).rejects.toMatchObject({
      codigo: 'BACKUP_FALHOU',
      message: 'BACKUP_FALHOU',
    })
    expect(ciclo.fechar).toHaveBeenCalledTimes(1)
    expect(arquivos.copiar).toHaveBeenCalledTimes(1)
    expect(ciclo.solicitarReabertura).toHaveBeenCalledTimes(1)
    expect(arquivos.copiar.mock.invocationCallOrder[0]).toBeLessThan(
      ciclo.solicitarReabertura.mock.invocationCallOrder[0] ?? 0,
    )
  })

  it('mantém BACKUP_FALHOU se o pedido de reinício também falhar', async () => {
    const origem = path.join(diretorios[1] ?? '', 'outro.db')
    writeFileSync(origem, 'dados do backup')
    const ciclo = cicloFalso()
    const arquivos = arquivosFalso()
    arquivos.copiar.mockRejectedValueOnce(new Error('erro de disco'))
    ciclo.solicitarReabertura.mockImplementationOnce(() => {
      throw new Error('falha ao reiniciar')
    })
    const servico = new BackupServico(ciclo.porta, arquivos.porta, diretorios)

    await expect(servico.restaurar({ caminho: origem })).rejects.toMatchObject({
      codigo: 'BACKUP_FALHOU',
      message: 'BACKUP_FALHOU',
      mensagem: expect.not.stringContaining('falha ao reiniciar'),
    })
    expect(ciclo.solicitarReabertura).toHaveBeenCalledTimes(1)
  })
})
