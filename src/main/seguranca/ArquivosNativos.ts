import { copyFile, stat, writeFile } from 'node:fs/promises'
import { dialog } from 'electron'
import type {
  CelulaCsv,
  DialogoAbrirEntrada,
  DialogoSalvarEntrada,
  FiltroArquivo,
  ResultadoDialogo,
} from '../../shared/contratos/modelos'
import { linhaCsv } from './Csv'

/**
 * Fronteira nativa (ADR 0019): diálogos, cópia e escrita acontecem no main.
 * O renderer nunca informa caminho — só títulos, filtros e dados já agregados.
 */
export interface PortaArquivos {
  abrir(entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo>
  salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo>
  confirmar(mensagem: string): Promise<boolean>
  copiar(origem: string, destino: string): Promise<number>
  escreverCsv(
    caminho: string,
    cabecalhos: readonly string[],
    linhas: readonly (readonly CelulaCsv[])[],
  ): Promise<number>
}

export interface DepsArquivosNativos {
  escolherArquivo(entrada: DialogoAbrirEntrada): Promise<string | null>
  escolherDestino(entrada: DialogoSalvarEntrada): Promise<string | null>
  confirmar(mensagem: string): Promise<boolean>
  copiar(origem: string, destino: string): Promise<void>
  tamanho(caminho: string): Promise<number>
  escrever(caminho: string, conteudo: string): Promise<void>
}

function filtros(filtros: readonly FiltroArquivo[] | undefined): Electron.FileFilter[] | undefined {
  return filtros?.map((filtro) => ({
    name: filtro.nome,
    extensions: filtro.extensoes.map((extensao) => extensao.replace(/^\./u, '')),
  }))
}

function depsPadrao(): DepsArquivosNativos {
  return {
    async escolherArquivo(entrada) {
      const resposta = await dialog.showOpenDialog({
        title: entrada.titulo,
        filters: filtros(entrada.filtros),
        properties: ['openFile'],
      })
      return resposta.canceled ? null : (resposta.filePaths[0] ?? null)
    },
    async escolherDestino(entrada) {
      const resposta = await dialog.showSaveDialog({
        title: entrada.titulo,
        defaultPath: entrada.nomeSugerido,
        filters: filtros(entrada.filtros),
      })
      return resposta.canceled ? null : (resposta.filePath ?? null)
    },
    async confirmar(mensagem) {
      const resposta = await dialog.showMessageBox({
        type: 'warning',
        buttons: ['Cancelar', 'Restaurar'],
        defaultId: 0,
        cancelId: 0,
        message: mensagem,
      })
      return resposta.response === 1
    },
    async copiar(origem, destino) {
      await copyFile(origem, destino)
    },
    async tamanho(caminho) {
      return (await stat(caminho)).size
    },
    async escrever(caminho, conteudo) {
      await writeFile(caminho, conteudo, 'utf8')
    },
  }
}

/** Adaptador único da API nativa; nos testes, todas as dependências são falsas. */
export class ArquivosNativos implements PortaArquivos {
  private readonly deps: DepsArquivosNativos

  constructor(deps: Partial<DepsArquivosNativos> = {}) {
    this.deps = { ...depsPadrao(), ...deps }
  }

  async abrir(entrada: DialogoAbrirEntrada): Promise<ResultadoDialogo> {
    return { caminho: await this.deps.escolherArquivo(entrada) }
  }

  async salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo> {
    return { caminho: await this.deps.escolherDestino(entrada) }
  }

  confirmar(mensagem: string): Promise<boolean> {
    return this.deps.confirmar(mensagem)
  }

  async copiar(origem: string, destino: string): Promise<number> {
    await this.deps.copiar(origem, destino)
    return this.deps.tamanho(destino)
  }

  async escreverCsv(
    caminho: string,
    cabecalhos: readonly string[],
    linhas: readonly (readonly CelulaCsv[])[],
  ): Promise<number> {
    const conteudo =
      [linhaCsv(cabecalhos), ...linhas.map((linha) => linhaCsv(linha))].join('\r\n') + '\r\n'
    await this.deps.escrever(caminho, conteudo)
    return Buffer.byteLength(conteudo, 'utf8')
  }
}
