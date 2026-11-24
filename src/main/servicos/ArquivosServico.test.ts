import { describe, expect, it, vi } from 'vitest'
import type {
  DialogoAbrirEntrada,
  DialogoSalvarEntrada,
  ResultadoDialogo,
} from '../../shared/contratos/modelos'
import { ArquivosServico, type PortaDialogos } from './ArquivosServico'

function arquivosFalso() {
  const abrir = vi.fn(
    async (_entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo> => ({
      caminho: 'C:/documentos/a.db',
    }),
  )
  const salvar = vi.fn(
    async (_entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo> => ({
      caminho: 'C:/downloads/a.csv',
    }),
  )
  const porta: PortaDialogos = { abrir, salvar }
  return { porta, abrir, salvar }
}

describe('ArquivosServico', () => {
  it('repassa a entrada e o resultado do diálogo de abrir', async () => {
    const falso = arquivosFalso()
    const servico = new ArquivosServico(falso.porta)
    const entrada: DialogoAbrirEntrada = {
      titulo: 'Escolher backup',
      filtros: [{ nome: 'Banco', extensoes: ['.db'] }],
    }

    expect(await servico.abrir(entrada)).toEqual({ caminho: 'C:/documentos/a.db' })
    expect(falso.abrir).toHaveBeenCalledWith(entrada)
    expect(falso.salvar).not.toHaveBeenCalled()
  })

  it('repassa a entrada e o cancelamento do diálogo de salvar', async () => {
    const falso = arquivosFalso()
    falso.salvar.mockResolvedValueOnce({ caminho: null })
    const servico = new ArquivosServico(falso.porta)
    const entrada: DialogoSalvarEntrada = { nomeSugerido: 'relatorio.csv' }

    expect(await servico.salvar(entrada)).toEqual({ caminho: null })
    expect(falso.salvar).toHaveBeenCalledWith(entrada)
  })
})
