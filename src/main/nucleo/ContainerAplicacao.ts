import type { DatabaseSync } from 'node:sqlite'
import type {
  PortaServicoCategorias,
  PortaServicoClientes,
  PortaServicoDevolucoes,
  PortaServicoEquipamentos,
  PortaServicoFornecedores,
  PortaServicoIntegracoes,
  PortaServicoManutencoes,
  PortaServicoPagamentos,
  PortaServicoReservas,
  PortaServicoUsuarios,
} from '../../shared/contratos/servicos'

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

/**
 * Conjunto completo das portas de serviço. Quem implementa cada módulo entrega
 * a instância ao container; o ED só recebe o provedor já ligado e delega nos
 * handlers — nunca instancia serviço nem implementa regra de negócio.
 */
export interface ProvedorServicos {
  readonly categorias: PortaServicoCategorias
  readonly equipamentos: PortaServicoEquipamentos
  readonly clientes: PortaServicoClientes
  readonly fornecedores: PortaServicoFornecedores
  readonly reservas: PortaServicoReservas
  readonly devolucoes: PortaServicoDevolucoes
  readonly pagamentos: PortaServicoPagamentos
  readonly manutencoes: PortaServicoManutencoes
  readonly usuarios: PortaServicoUsuarios
  readonly integracoes: PortaServicoIntegracoes
}

export type NomeServico = keyof ProvedorServicos

type FabricaRepositorio<T> = (db: DatabaseSync) => Repositorio<T>

export class ContainerAplicacao {
  private readonly repositorios = new Map<string, FabricaRepositorio<unknown>>()
  private readonly servicos = new Map<NomeServico, unknown>()

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

  /**
   * Registra uma porta de serviço isolada. O dono do módulo chama isto ao ligar
   * seu `Servico<Entidade>`; o ED não implementa serviços.
   */
  registrarServico<T extends NomeServico>(nome: T, servico: ProvedorServicos[T]): void {
    if (this.servicos.has(nome)) {
      throw new Error(`Servico duplicado: ${nome}`)
    }
    this.servicos.set(nome, servico)
  }

  /** Recupera a porta tipada para o handler delegar sem conhecer a classe. */
  obterServico<T extends NomeServico>(nome: T): ProvedorServicos[T] {
    const servico = this.servicos.get(nome)
    if (!servico) {
      throw new Error(`Servico nao registrado: ${nome}`)
    }
    return servico as ProvedorServicos[T]
  }

  /** Atalho para o composition root ligar todas as portas de uma vez. */
  registrarProvedorServicos(provedor: ProvedorServicos): void {
    this.registrarServico('categorias', provedor.categorias)
    this.registrarServico('equipamentos', provedor.equipamentos)
    this.registrarServico('clientes', provedor.clientes)
    this.registrarServico('fornecedores', provedor.fornecedores)
    this.registrarServico('reservas', provedor.reservas)
    this.registrarServico('devolucoes', provedor.devolucoes)
    this.registrarServico('pagamentos', provedor.pagamentos)
    this.registrarServico('manutencoes', provedor.manutencoes)
    this.registrarServico('usuarios', provedor.usuarios)
    this.registrarServico('integracoes', provedor.integracoes)
  }

  /** Provedor completo; falha se algum módulo ainda não foi registrado. */
  obterProvedorServicos(): ProvedorServicos {
    return {
      categorias: this.obterServico('categorias'),
      equipamentos: this.obterServico('equipamentos'),
      clientes: this.obterServico('clientes'),
      fornecedores: this.obterServico('fornecedores'),
      reservas: this.obterServico('reservas'),
      devolucoes: this.obterServico('devolucoes'),
      pagamentos: this.obterServico('pagamentos'),
      manutencoes: this.obterServico('manutencoes'),
      usuarios: this.obterServico('usuarios'),
      integracoes: this.obterServico('integracoes'),
    }
  }

  get totalRepositorios(): number {
    return this.repositorios.size
  }

  get totalServicos(): number {
    return this.servicos.size
  }
}
