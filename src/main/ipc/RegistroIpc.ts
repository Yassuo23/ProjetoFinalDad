import type { ZodType } from 'zod'
import type { Canal } from '../../shared/contratos/canais'
import type { Sessao } from '../../shared/contratos/modelos'
import { ErroDeDominio } from '../servicos/ErroDeDominio'

/** Porta mínima do ipcMain — permite testar sem subir o Electron. */
export interface RegistradorIpc {
  handle(canal: string, ouvinte: (evento: unknown, ...argumentos: unknown[]) => unknown): void
}

/** Perfis usados na declaração de cada canal (ADR 0007, estendida pela ADR 0009). */
export type PerfilAcesso = 'administrador' | 'atendente' | 'cliente' | 'anonimo'

/**
 * Conjuntos nomeados: todo canal deve declarar um deles explicitamente.
 * `publico` inclui `anonimo` (sem sessão) e todos os perfis autenticados.
 * `ambos` é somente staff (administrador + atendente); `cliente` é restrito
 * aos dados do próprio cliente, filtrados por propriedade no main (ADR 0009).
 */
export const PERFIS = {
  publico: ['anonimo', 'cliente', 'atendente', 'administrador'],
  anonimo: ['anonimo'],
  autenticados: ['cliente', 'atendente', 'administrador'],
  ambos: ['administrador', 'atendente'],
  cliente: ['cliente'],
  admin: ['administrador'],
} as const satisfies Record<string, readonly PerfilAcesso[]>

/**
 * Guarda de sessão injetável. Sem provedor, o registro roda em modo legado
 * (compatibilidade com composições de teste que não possuem `auth:*`).
 * `src/main/index.ts` sempre injeta o `AutenticacaoServico`, que mantém a
 * sessão somente em memória no processo principal.
 */
export interface ProvedorSessaoIpc {
  sessao(): Sessao | null
}

/**
 * Mapeamento explícito dos valores de `PerfilUsuario` para a guarda.
 * Um perfil desconhecido é negado (fail-closed), nunca tratado como atendente.
 * `string` como chave mantém o main compatível durante a adição de `Cliente`
 * ao contrato compartilhado pela ADR 0009.
 */
const PERFIL_DA_SESSAO: Readonly<Partial<Record<string, PerfilAcesso>>> = {
  Administrador: 'administrador',
  Atendente: 'atendente',
  Cliente: 'cliente',
}

function perfilDeAcesso(sessao: Sessao): PerfilAcesso {
  const perfil = PERFIL_DA_SESSAO[sessao.perfil]
  if (perfil === undefined) {
    throw new ErroDeDominio('SEM_PERMISSAO', 'Perfil de sessão não reconhecido.')
  }
  return perfil
}

export class RegistroIpc {
  private readonly canais = new Set<string>()

  constructor(
    private readonly ipc: RegistradorIpc,
    private readonly provedorSessao?: ProvedorSessaoIpc,
  ) {}

  registrar<Entrada, Saida>(
    canal: Canal,
    esquema: ZodType<Entrada>,
    tratar: (entrada: Entrada) => Promise<Saida>,
    /** Perfis permitidos: obrigatório, para nenhum canal nascer público por esquecimento. */
    perfis: readonly PerfilAcesso[],
  ): void {
    if (this.canais.has(canal)) {
      throw new Error(`Canal duplicado: ${canal}`)
    }
    this.canais.add(canal)

    this.ipc.handle(canal, async (_evento, bruto: unknown) => {
      if (this.provedorSessao) {
        const sessao = this.provedorSessao.sessao()
        if (!perfis.includes('anonimo') && !sessao) {
          throw new ErroDeDominio('NAO_AUTENTICADO', 'É necessário entrar para continuar.')
        }
        if (sessao && !perfis.includes(perfilDeAcesso(sessao))) {
          throw new ErroDeDominio('SEM_PERMISSAO', 'Você não tem permissão para esta operação.')
        }
      }

      const resultado = esquema.safeParse(bruto)
      if (!resultado.success) {
        // Loga apenas os caminhos dos campos: Zod pode carregar a senha em `issue.input`.
        const caminhos = resultado.error.issues
          .map((issue) => issue.path.join('.'))
          .join(', ')
        console.error(`[IPC] Payload inválido em ${canal}`, caminhos)
        throw new Error(`IPC_INVALIDO:${canal}`)
      }
      return tratar(resultado.data)
    })
  }

  get total(): number {
    return this.canais.size
  }
}
