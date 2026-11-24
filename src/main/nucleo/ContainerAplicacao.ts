import type { DatabaseSync } from 'node:sqlite'

/**
 * Composition root da aplicação.
 *
 * Ponto único onde repositórios, serviços e handlers são instanciados e ligados
 * por injeção de dependência. O `main/index.ts` (ED) apenas chama
 * `new ContainerAplicacao(db).registrarHandlers(registro)` — nenhum `new` de
 * serviço/repositório fora daqui.
 *
 * As portas abaixo são contratos: cada dev implementa a sua classe numa pasta
 * de módulo, sem alterar este arquivo.
 */

/** Porta de acesso a dados — o BD concrete todos os repositórios. */
export interface Repositorio<TEntidade, TId = number> {
  listar(): Promise<readonly TEntidade[]>
  obter(id: TId): Promise<TEntidade | null>
  criar(entrada: Omit<TEntidade, 'id'>): Promise<TEntidade>
  atualizar(id: TId, entrada: Partial<TEntidade>): Promise<TEntidade | null>
  excluir(id: TId): Promise<boolean>
}

/** Porta de integração externa — o IA implementa cada cliente. */
export interface ClienteIntegracao<TResposta> {
  consultar(entrada: string): Promise<TResposta>
}

type FabricaRepositorio<T> = (db: DatabaseSync) => Repositorio<T>

export class ContainerAplicacao {
  private readonly repositorios = new Map<string, FabricaRepositorio<unknown>>()

  constructor(private readonly db: DatabaseSync) {}

  /**
   * Registra a fábrica de um repositório. Chamado uma vez por módulo, na raiz.
   * Genérico preservado no registro; a recuperação usa type guard no chamador.
   */
  registrarRepositorio<T>(nome: string, fabrica: FabricaRepositorio<T>): void {
    if (this.repositorios.has(nome)) {
      throw new Error(`Repositorio duplicado: ${nome}`)
    }
    this.repositorios.set(nome, fabrica as FabricaRepositorio<unknown>)
  }

  /** Cria uma instância do repositório com a conexão já injetada. */
  obterRepositorio<T>(nome: string): Repositorio<T> {
    const fabrica = this.repositorios.get(nome)
    if (!fabrica) {
      throw new Error(`Repositorio nao registrado: ${nome}`)
    }
    return fabrica(this.db) as Repositorio<T>
  }

  get totalRepositorios(): number {
    return this.repositorios.size
  }
}
