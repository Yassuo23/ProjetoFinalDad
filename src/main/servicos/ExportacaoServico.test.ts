import { describe, expect, it, vi } from 'vitest'
import type {
  CelulaCsv,
  DialogoSalvarEntrada,
  ExportacaoCsvEntrada,
  ResultadoDialogo,
} from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'
import { ExportacaoServico, type PortaExportacao } from './ExportacaoServico'

const ENTRADA: ExportacaoCsvEntrada = {
  titulo: 'Relatório de equipamentos',
  nomeSugerido: 'equipamentos.csv',
  cabecalhos: ['Equipamento', 'Valor'],
  linhas: [['Tenda', 250]],
}

function arquivosFalso() {
  const salvar = vi.fn(async (_entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo> => ({
    caminho: null,
  }))
  const escreverCsv = vi.fn(
    async (
      _caminho: string,
      _cabecalhos: readonly string[],
      _linhas: readonly (readonly CelulaCsv[])[],
    ): Promise<number> => 64,
  )
  const porta: PortaExportacao = { salvar, escreverCsv }
  return { porta, salvar, escreverCsv }
}

describe('ExportacaoServico', () => {
  it('devolve cancelamento sem escrever quando o diálogo é cancelado', async () => {
    const arquivos = arquivosFalso()
    const servico = new ExportacaoServico(arquivos.porta)

    expect(await servico.csv(ENTRADA)).toEqual({ caminho: null })
    expect(arquivos.escreverCsv).not.toHaveBeenCalled()
  })

  it('fixa o filtro .csv e escreve cabeçalhos e linhas no caminho escolhido', async () => {
    const arquivos = arquivosFalso()
    const destino = '/downloads/equipamentos.csv'
    arquivos.salvar.mockResolvedValueOnce({ caminho: destino })
    arquivos.escreverCsv.mockResolvedValueOnce(128)
    const servico = new ExportacaoServico(arquivos.porta)

    expect(await servico.csv(ENTRADA)).toEqual({ caminho: destino })
    expect(arquivos.salvar).toHaveBeenCalledWith({
      titulo: ENTRADA.titulo,
      nomeSugerido: ENTRADA.nomeSugerido,
      filtros: [{ nome: expect.any(String), extensoes: ['.csv'] }],
    })
    expect(arquivos.escreverCsv).toHaveBeenCalledWith(
      destino,
      ENTRADA.cabecalhos,
      ENTRADA.linhas,
    )
  })

  it('usa título e nome padrão quando a entrada não os informa', async () => {
    const arquivos = arquivosFalso()
    arquivos.salvar.mockResolvedValueOnce({ caminho: '/downloads/zenite.csv' })
    const servico = new ExportacaoServico(arquivos.porta)

    await servico.csv({ cabecalhos: ['Nome'], linhas: [['Tenda']] })

    expect(arquivos.salvar).toHaveBeenCalledWith({
      titulo: expect.any(String),
      nomeSugerido: expect.stringMatching(/\.csv$/u),
      filtros: [{ nome: expect.any(String), extensoes: ['.csv'] }],
    })
  })

  it('converte falha de escrita em EXPORTACAO_FALHOU sem detalhe do sistema', async () => {
    const arquivos = arquivosFalso()
    arquivos.salvar.mockResolvedValueOnce({ caminho: '/downloads/equipamentos.csv' })
    arquivos.escreverCsv.mockRejectedValueOnce(new Error(' permissão negada /driver'))
    const servico = new ExportacaoServico(arquivos.porta)

    const promessa = servico.csv(ENTRADA)
    await expect(promessa).rejects.toBeInstanceOf(ErroDeDominio)
    await expect(promessa).rejects.toMatchObject({
      codigo: 'EXPORTACAO_FALHOU',
      message: 'EXPORTACAO_FALHOU',
      mensagem: expect.not.stringContaining('permissão negada'),
    })
  })
})
