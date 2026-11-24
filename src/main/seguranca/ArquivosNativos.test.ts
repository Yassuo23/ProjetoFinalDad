import { describe, expect, it, vi } from 'vitest'
import { ArquivosNativos, type DepsArquivosNativos } from './ArquivosNativos'

function depsFalsas(): DepsArquivosNativos {
  return {
    escolherArquivo: vi.fn(async () => 'C:/documentos/zenite.db'),
    escolherDestino: vi.fn(async () => 'C:/downloads/zenite-20261123.db'),
    confirmar: vi.fn(async () => true),
    copiar: vi.fn(async () => undefined),
    tamanho: vi.fn(async () => 2048),
    escrever: vi.fn(async () => undefined),
  }
}

describe('ArquivosNativos', () => {
  it('devolve null quando o diálogo é cancelado', async () => {
    const deps = depsFalsas()
    deps.escolherArquivo = vi.fn(async () => null)
    deps.escolherDestino = vi.fn(async () => null)

    const arquivos = new ArquivosNativos(deps)

    expect(await arquivos.abrir({ titulo: 'Escolher backup' })).toEqual({ caminho: null })
    expect(await arquivos.salvar({ nomeSugerido: 'zenite.db' })).toEqual({ caminho: null })
  })

  it('repassa filtros e título sem montar caminho no renderer', async () => {
    const deps = depsFalsas()
    const arquivos = new ArquivosNativos(deps)

    expect(
      await arquivos.abrir({
        titulo: 'Selecione o backup',
        filtros: [{ nome: 'Banco', extensoes: ['.db'] }],
      }),
    ).toEqual({ caminho: 'C:/documentos/zenite.db' })
    expect(deps.escolherArquivo).toHaveBeenCalledWith({
      titulo: 'Selecione o backup',
      filtros: [{ nome: 'Banco', extensoes: ['.db'] }],
    })
  })

  it('copia e informa bytes, repassando a confirmação', async () => {
    const deps = depsFalsas()
    const arquivos = new ArquivosNativos(deps)

    expect(await arquivos.confirmar('Substituir o banco?')).toBe(true)
    expect(await arquivos.copiar('C:/origem.db', 'C:/destino.db')).toBe(2048)
    expect(deps.copiar).toHaveBeenCalledWith('C:/origem.db', 'C:/destino.db')
  })

  it('escreve CSV escapado e devolve o tamanho em bytes', async () => {
    const deps = depsFalsas()
    const arquivos = new ArquivosNativos(deps)

    const bytes = await arquivos.escreverCsv(
      'C:/downloads/relatorio.csv',
      ['Equipamento', 'Valor'],
      [['=cmd', 42]],
    )

    expect(bytes).toBeGreaterThan(0)
    expect(deps.escrever).toHaveBeenCalledWith(
      'C:/downloads/relatorio.csv',
      '"Equipamento","Valor"\r\n"\'=cmd","42"\r\n',
    )
  })
})
