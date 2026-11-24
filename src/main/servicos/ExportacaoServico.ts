import type {
  CelulaCsv,
  DialogoSalvarEntrada,
  ExportacaoCsvEntrada,
  FiltroArquivo,
  ResultadoDialogo,
} from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'

/** Porta de arquivos necessária à exportação; compatível com `PortaArquivos` do main. */
export interface PortaExportacao {
  salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo>
  escreverCsv(
    caminho: string,
    cabecalhos: readonly string[],
    linhas: readonly (readonly CelulaCsv[])[],
  ): Promise<number>
}

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoExportacao {
  csv(entrada: ExportacaoCsvEntrada): Promise<ResultadoDialogo>
}

const TITULO_PADRAO = 'Exportar dados do Zênite'
const NOME_PADRAO = 'zenite-exportacao.csv'
const FILTROS: FiltroArquivo[] = [{ nome: 'Planilha CSV', extensoes: ['.csv'] }]

/** O main fixa o filtro e o caminho; o renderer apenas agrega os dados. */
export class ExportacaoServico implements ServicoExportacao {
  constructor(private readonly arquivos: PortaExportacao) {}

  async csv(entrada: ExportacaoCsvEntrada): Promise<ResultadoDialogo> {
    try {
      const { caminho } = await this.arquivos.salvar({
        titulo: entrada.titulo ?? TITULO_PADRAO,
        nomeSugerido: entrada.nomeSugerido ?? NOME_PADRAO,
        filtros: FILTROS,
      })
      if (caminho === null) return { caminho: null }

      await this.arquivos.escreverCsv(caminho, entrada.cabecalhos, entrada.linhas)
      return { caminho }
    } catch (erro) {
      if (erro instanceof ErroDeDominio) throw erro
      throw new ErroDeDominio('EXPORTACAO_FALHOU', 'Não foi possível exportar o CSV.')
    }
  }
}
