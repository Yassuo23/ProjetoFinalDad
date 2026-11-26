import type { CodigoErroDominio, MotivoIndisponibilidade } from '../../../shared/contratos/modelos'

/**
 * Tradução de falhas que atravessam o IPC. `ErroDeDominio` chega como `Error`
 * cuja `message` é o código estável; ler `message` com type guard evita `any`
 * e nunca expõe SQL, driver ou pilha ao usuário.
 */
const CODIGOS: readonly CodigoErroDominio[] = [
  'NAO_ENCONTRADO',
  'REGISTRO_DUPLICADO',
  'RELACAO_INVALIDA',
  'PERIODO_INVALIDO',
  'EQUIPAMENTO_INDISPONIVEL',
  'CEP_INVALIDO',
  'CLIMA_INDISPONIVEL',
  'URL_NAO_PERMITIDA',
  'DADOS_INVALIDOS',
  'CREDENCIAIS_INVALIDAS',
  'USUARIO_INATIVO',
  'SEM_PERMISSAO',
  'NAO_AUTENTICADO',
  'SENHA_FRACA',
  'BOOTSTRAP_JA_REALIZADO',
  'LOGIN_DUPLICADO',
  'PERFIL_INVALIDO',
  'CPF_DUPLICADO',
  'BOOTSTRAP_PENDENTE',
]

export function codigoErro(erro: unknown): CodigoErroDominio | null {
  if (!(erro instanceof Error)) {
    return null
  }
  return CODIGOS.find((codigo) => codigo === erro.message) ?? null
}

/**
 * `RELACAO_INVALIDA` é o código real usado pelo main quando uma FK bloqueia
 * inativação/exclusão. Não existe `EM_USO` nem `FK_BLOQUEIA_EXCLUSAO` no
 * contrato atual — ver `CodigoErroDominio` e `ErrosBanco` no processo principal.
 */
export function mensagemErroOperacao(erro: unknown, objeto: string): string {
  const codigo = codigoErro(erro)
  switch (codigo) {
    case 'RELACAO_INVALIDA':
      return `Não foi possível inativar ${objeto}: há registros vinculados que dependem dele. Nada foi removido. Verifique os vínculos e tente novamente.`
    case 'REGISTRO_DUPLICADO':
      return `Já existe ${objeto} com esses dados. Confira as informações e tente novamente.`
    case 'PERIODO_INVALIDO':
      return 'Confira o período informado: a data de fim deve ser igual ou posterior à de início.'
    case 'EQUIPAMENTO_INDISPONIVEL':
      return 'Um dos equipamentos não está disponível para o período escolhido. Selecione outro item ou outra data.'
    case 'NAO_AUTENTICADO':
      return 'Sua sessão expirou. Entre novamente para continuar.'
    case 'SEM_PERMISSAO':
      return 'Você não tem permissão para esta operação.'
    case 'NAO_ENCONTRADO':
      return `Não encontramos ${objeto}. Atualize a lista e tente novamente.`
    case 'DADOS_INVALIDOS':
      return `Não foi possível salvar ${objeto}. Confira os campos e tente novamente.`
    default:
      return `Não foi possível concluir a operação com ${objeto}. Tente novamente em instantes.`
  }
}

/** Indisponibilidade é estado explícito e discreto, nunca erro fatal. */
export function mensagemIntegracao(motivo: MotivoIndisponibilidade, servico: string): string {
  const textos: Readonly<Record<MotivoIndisponibilidade, string>> = {
    SERVICO_FORA: `Serviço de ${servico} indisponível. Você pode continuar manualmente.`,
    CREDENCIAL_AUSENTE: `Consulta de ${servico} temporariamente desativada. Você pode continuar manualmente.`,
    SEM_DADOS: `Não encontramos dados de ${servico}. Preencha manualmente.`,
    PESQUISA_INVALIDA: `Confira os dados informados antes de consultar ${servico}.`,
  }
  return textos[motivo]
}
