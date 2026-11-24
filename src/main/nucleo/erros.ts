import type { CodigoErroDominio, ErroApi } from '../../shared/contratos/modelos'
import type { Canal } from '../../shared/contratos/canais'

/**
 * Base de todos os erros de domínio do Zênite.
 *
 * Regra: `mensagemPublica` atravessa a ponte IPC; `detalheInterno` fica no main
 * (log) e nunca é serializado para o renderer. R7: sem `any`, sem stack na API.
 * Este arquivo roda no main (contém runtime) e NUNCA no preload.
 */
export abstract class ErroDominio extends Error {
  abstract readonly codigo: CodigoErroDominio

  constructor(
    readonly mensagemPublica: string,
    readonly detalheInterno: string = '',
  ) {
    super(mensagemPublica)
    this.name = new.target.name
  }

  /** Converte para o formato único da ponte, sem detalhe interno. */
  paraApi(canal: Canal): ErroApi {
    return { codigo: this.codigo, mensagem: this.mensagemPublica, canal }
  }
}

export class ErroValidacao extends ErroDominio {
  readonly codigo = 'VALIDACAO' as const

  constructor(mensagemPublica: string, detalheInterno = '') {
    super(mensagemPublica, detalheInterno)
  }
}

export class ErroNaoEncontrado extends ErroDominio {
  readonly codigo = 'NAO_ENCONTRADO' as const

  constructor(entidade: string, detalheInterno = '') {
    super(`${entidade} nao encontrado.`, detalheInterno)
  }
}

export class ErroConflito extends ErroDominio {
  readonly codigo = 'CONFLITO' as const

  constructor(mensagemPublica: string, detalheInterno = '') {
    super(mensagemPublica, detalheInterno)
  }
}

export class ErroRegraNegocio extends ErroDominio {
  readonly codigo = 'REGRA_NEGOCIO' as const

  constructor(mensagemPublica: string, detalheInterno = '') {
    super(mensagemPublica, detalheInterno)
  }
}

export class ErroIntegracao extends ErroDominio {
  readonly codigo = 'INTEGRACAO_INDISPONIVEL' as const

  constructor(servico: string, detalheInterno = '') {
    super(`Servico ${servico} indisponivel no momento.`, detalheInterno)
  }
}

export class ErroSemPermissao extends ErroDominio {
  readonly codigo = 'SEM_PERMISSAO' as const

  constructor(mensagemPublica = 'Sem permissao para esta operacao.', detalheInterno = '') {
    super(mensagemPublica, detalheInterno)
  }
}

/** Type guard sem `any`: estreita um valor desconhecido vindo de IPC. */
export function eErroDominio(valor: unknown): valor is ErroDominio {
  return valor instanceof ErroDominio
}
