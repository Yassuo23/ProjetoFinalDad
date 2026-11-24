import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConexaoBanco } from './ConexaoBanco'
import { CicloBanco } from './CicloBanco'

const temporarios: { diretorio: string; conexao: ConexaoBanco }[] = []

function criarCiclo(): { ciclo: CicloBanco; reiniciador: { reiniciar: ReturnType<typeof vi.fn> } } {
  const diretorio = mkdtempSync(path.join(tmpdir(), 'zenite-ciclo-'))
  const caminho = path.join(diretorio, 'zenite.db')
  const conexao = new ConexaoBanco(caminho)
  temporarios.push({ diretorio, conexao })
  const reiniciador = { reiniciar: vi.fn() }
  return { ciclo: new CicloBanco(conexao, caminho, reiniciador), reiniciador }
}

afterEach(() => {
  while (temporarios.length > 0) {
    const temporario = temporarios.pop()
    if (!temporario) continue
    temporario.conexao.fechar()
    rmSync(temporario.diretorio, { recursive: true, force: true })
  }
})

describe('CicloBanco', () => {
  it('expõe o banco, o caminho e aplica o checkpoint WAL', () => {
    const { ciclo } = criarCiclo()

    expect(ciclo.caminhoArquivo()).toContain('zenite.db')
    expect(() => ciclo.prepararCopia()).not.toThrow()
    expect(() => ciclo.db.exec('SELECT 1')).not.toThrow()
  })

  it('fecha de forma idempotente e só reinicia quando solicitado', () => {
    const { ciclo, reiniciador } = criarCiclo()

    expect(reiniciador.reiniciar).not.toHaveBeenCalled()
    ciclo.solicitarReabertura()
    expect(reiniciador.reiniciar).toHaveBeenCalledOnce()

    expect(() => {
      ciclo.fechar()
      ciclo.fechar()
    }).not.toThrow()
  })
})
