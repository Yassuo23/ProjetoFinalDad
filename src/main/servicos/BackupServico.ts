import { existsSync, realpathSync } from 'node:fs'
import path from 'node:path'
import type {
  BackupRestaurarEntrada,
  DialogoSalvarEntrada,
  FiltroArquivo,
  ResultadoDialogo,
  ResultadoOperacaoArquivo,
} from '../../shared/contratos/modelos'
import { ErroDeDominio } from './ErroDominio'

/** Porta do ciclo do banco: só o main a implementa (ADR 0019). */
export interface PortaCicloBancoServico {
  caminhoArquivo(): string
  prepararCopia(): void
  fechar(): void
  solicitarReabertura(): void
}

/** Porta de arquivos necessária ao backup; compatível com `PortaArquivos` do main. */
export interface PortaArquivosBackup {
  salvar(entrada: DialogoSalvarEntrada): Promise<ResultadoDialogo>
  confirmar(mensagem: string): Promise<boolean>
  copiar(origem: string, destino: string): Promise<number>
}

/** Porta usada pelo handler; implementação trocável nos testes. */
export interface ServicoBackup {
  criar(): Promise<ResultadoOperacaoArquivo>
  restaurar(entrada: BackupRestaurarEntrada): Promise<ResultadoOperacaoArquivo>
}

const TITULO_SALVAR = 'Salvar backup do Zênite'
const FILTROS: FiltroArquivo[] = [{ nome: 'Banco de dados', extensoes: ['.db'] }]
const MENSAGEM_CONFIRMACAO =
  'Restaurar este backup? O banco atual será substituído e o aplicativo será reiniciado.'

function nomeBackup(agora: Date): string {
  const ano = agora.getFullYear().toString().padStart(4, '0')
  const mes = (agora.getMonth() + 1).toString().padStart(2, '0')
  const dia = agora.getDate().toString().padStart(2, '0')
  const hora = agora.getHours().toString().padStart(2, '0')
  const minuto = agora.getMinutes().toString().padStart(2, '0')
  return `zenite-${ano}${mes}${dia}-${hora}${minuto}.db`
}

/**
 * Regras de backup e restauração (ADR 0019). Nenhum caminho vem do renderer:
 * `restaurar` valida extensão, existência e allowlist antes de qualquer cópia.
 */
export class BackupServico implements ServicoBackup {
  constructor(
    private readonly ciclo: PortaCicloBancoServico,
    private readonly arquivos: PortaArquivosBackup,
    private readonly diretoriosPermitidos: readonly string[],
  ) {}

  async criar(): Promise<ResultadoOperacaoArquivo> {
    try {
      const { caminho } = await this.arquivos.salvar({
        titulo: TITULO_SALVAR,
        nomeSugerido: nomeBackup(new Date()),
        filtros: FILTROS,
      })
      if (caminho === null) return { caminho: null, bytes: 0 }

      this.ciclo.prepararCopia()
      const bytes = await this.arquivos.copiar(this.ciclo.caminhoArquivo(), caminho)
      return { caminho, bytes }
    } catch (erro) {
      if (erro instanceof ErroDeDominio) throw erro
      throw new ErroDeDominio('BACKUP_FALHOU', 'Não foi possível criar o backup.')
    }
  }

  async restaurar({ caminho }: BackupRestaurarEntrada): Promise<ResultadoOperacaoArquivo> {
    if (!this.ehPermitido(caminho)) {
      throw new ErroDeDominio(
        'CAMINHO_NAO_PERMITIDO',
        'Escolha um arquivo .db em Documentos, Downloads ou no diretório do aplicativo.',
      )
    }

    const real = this.resolver(caminho)
    if (!this.ehPermitido(real)) {
      throw new ErroDeDominio(
        'CAMINHO_NAO_PERMITIDO',
        'Escolha um arquivo .db em Documentos, Downloads ou no diretório do aplicativo.',
      )
    }

    const confirmado = await this.arquivos.confirmar(MENSAGEM_CONFIRMACAO)
    if (!confirmado) return { caminho: null, bytes: 0 }

    let precisaReabrir = false
    try {
      this.ciclo.fechar()
      precisaReabrir = true
      const bytes = await this.arquivos.copiar(caminho, this.ciclo.caminhoArquivo())
      this.ciclo.solicitarReabertura()
      precisaReabrir = false
      return { caminho, bytes }
    } catch (erro) {
      // Depois de fechar, a conexão e os repositórios só voltam no boot.
      if (precisaReabrir) {
        try {
          this.ciclo.solicitarReabertura()
        } catch {
          // O pedido de reinício é best-effort; o erro original continua valendo.
        }
      }
      if (erro instanceof ErroDeDominio) throw erro
      throw new ErroDeDominio('BACKUP_FALHOU', 'Não foi possível restaurar o backup.')
    }
  }

  /** Extensão `.db` e fronteira de diretório, antes de tocar no sistema de arquivos. */
  private ehPermitido(caminho: string): boolean {
    if (path.extname(caminho).toLowerCase() !== '.db') return false

    const alvo = this.comparavel(path.resolve(caminho))
    return this.diretoriosPermitidos.some((diretorio) => {
      const base = this.comparavel(path.resolve(diretorio))
      const prefixo = base.endsWith(path.sep) ? base : base + path.sep
      return alvo === base || alvo.startsWith(prefixo)
    })
  }

  private resolver(caminho: string): string {
    try {
      if (!existsSync(caminho)) {
        throw new ErroDeDominio('ARQUIVO_NAO_ENCONTRADO', 'Arquivo de backup não encontrado.')
      }
      return realpathSync(caminho)
    } catch (erro) {
      if (erro instanceof ErroDeDominio) throw erro
      throw new ErroDeDominio('ARQUIVO_NAO_ENCONTRADO', 'Arquivo de backup não encontrado.')
    }
  }

  /** No Windows a comparação de caminhos é insensível a maiúsculas. */
  private comparavel(caminho: string): string {
    return process.platform === 'win32' ? caminho.toLowerCase() : caminho
  }
}
