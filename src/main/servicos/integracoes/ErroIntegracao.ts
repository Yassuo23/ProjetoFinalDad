import type { MotivoIndisponibilidade } from '../../../shared/contratos/modelos'

/** Mensagens fixas e amigáveis: nunca incluem URL, status, header ou stack. */
const MENSAGENS: Readonly<Record<MotivoIndisponibilidade, string>> = {
  SERVICO_FORA: 'Serviço temporariamente indisponível. Tente novamente mais tarde.',
  CREDENCIAL_AUSENTE: 'Credencial de integração não configurada.',
  SEM_DADOS: 'Não encontramos dados para esta consulta.',
  PESQUISA_INVALIDA: 'Consulta inválida. Confira os dados informados.',
}

/** Erro interno do main; o renderer recebe apenas `motivo` e `mensagem`. */
export class ErroIntegracao extends Error {
  readonly motivo: MotivoIndisponibilidade

  constructor(motivo: MotivoIndisponibilidade, mensagem?: string) {
    super(mensagem ?? MENSAGENS[motivo])
    this.name = 'ErroIntegracao'
    this.motivo = motivo
  }
}

export function motivoIntegracao(erro: unknown): MotivoIndisponibilidade {
  return erro instanceof ErroIntegracao ? erro.motivo : 'SERVICO_FORA'
}

export function mensagemIntegracao(erro: unknown): string {
  return erro instanceof ErroIntegracao ? erro.message : MENSAGENS.SERVICO_FORA
}
