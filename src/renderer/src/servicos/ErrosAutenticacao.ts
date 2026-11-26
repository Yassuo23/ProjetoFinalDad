import type { CodigoErroDominio } from '../../../shared/contratos/modelos'

/**
 * Tradução de erros de autenticação para pt-BR.
 *
 * `ErroDeDominio` chega ao IPC como `Error` cuja `message` é o código estável;
 * propriedades extras não sobrevivem à serialização. Por isso a leitura é feita
 * com type guard sobre `message`, nunca com `any` nem com texto de driver.
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

export type MotivoErroAutenticacao =
  | 'credenciais'
  | 'bloqueio'
  | 'inativo'
  | 'senhaFraca'
  | 'loginDuplicado'
  | 'bootstrapConcluido'
  | 'cpfDuplicado'
  | 'bootstrapPendente'
  | 'perfilInvalido'
  | 'dadosInvalidos'
  | 'semAcesso'
  | 'desconhecido'

function codigoDaMensagem(mensagem: string): CodigoErroDominio | null {
  return CODIGOS.find((codigo) => codigo === mensagem) ?? null
}

export function motivoErroAutenticacao(erro: unknown): MotivoErroAutenticacao {
  if (!(erro instanceof Error)) {
    return 'desconhecido'
  }

  const mensagem = erro.message
  // O main pode passar a sinalizar bloqueio com um código/texto novo; enquanto
  // isso não acontece, CREDENCIAIS_INVALIDAS permanece genérico por segurança.
  if (/bloque|tentativa/i.test(mensagem)) {
    return 'bloqueio'
  }

  const codigo = codigoDaMensagem(mensagem)
  if (codigo !== null) {
    switch (codigo) {
      case 'CREDENCIAIS_INVALIDAS':
        return 'credenciais'
      case 'USUARIO_INATIVO':
        return 'inativo'
      case 'SENHA_FRACA':
        return 'senhaFraca'
      case 'LOGIN_DUPLICADO':
        return 'loginDuplicado'
      case 'BOOTSTRAP_JA_REALIZADO':
        return 'bootstrapConcluido'
      case 'CPF_DUPLICADO':
        return 'cpfDuplicado'
      case 'BOOTSTRAP_PENDENTE':
        return 'bootstrapPendente'
      case 'PERFIL_INVALIDO':
        return 'perfilInvalido'
      case 'DADOS_INVALIDOS':
        return 'dadosInvalidos'
      case 'SEM_PERMISSAO':
      case 'NAO_AUTENTICADO':
        return 'semAcesso'
      default:
        return 'desconhecido'
    }
  }

  if (mensagem.startsWith('IPC_INVALIDO:')) {
    return 'dadosInvalidos'
  }
  return 'desconhecido'
}

/** Nunca revela se o login existe, se a senha falhou ou se há bloqueio ativo. */
export function mensagemErroEntrada(motivo: MotivoErroAutenticacao): string {
  switch (motivo) {
    case 'bloqueio':
      return 'Muitas tentativas incorretas. Aguarde um minuto e tente novamente.'
    case 'inativo':
      return 'Usuário inativo. Procure o administrador para reativar o acesso.'
    case 'semAcesso':
      return 'Sua sessão expirou. Entre novamente.'
    default:
      return 'Usuário ou senha inválidos.'
  }
}

export function mensagemErroBootstrap(motivo: MotivoErroAutenticacao): string {
  switch (motivo) {
    case 'senhaFraca':
      return 'Use no mínimo 8 caracteres, com letra e número.'
    case 'loginDuplicado':
      return 'Este usuário já existe. Escolha outro login.'
    case 'bootstrapConcluido':
      return 'Já existe um administrador. Entre normalmente.'
    case 'dadosInvalidos':
      return 'Confira os dados informados e tente novamente.'
    case 'semAcesso':
      return 'Sua sessão não permite esta ação. Entre novamente.'
    case 'inativo':
      return 'Usuário inativo. Procure o administrador para reativar o acesso.'
    default:
      return 'Não foi possível criar o administrador. Tente novamente.'
  }
}

/** Textos do auto-cadastro: mensagens estáveis e sem dados de terceiros. */
export function mensagemErroCadastroCliente(motivo: MotivoErroAutenticacao): string {
  switch (motivo) {
    case 'cpfDuplicado':
      return 'CPF já cadastrado.'
    case 'bootstrapPendente':
      return 'Ainda não é possível criar contas de cliente. Fale com a loja.'
    case 'senhaFraca':
      return 'Use no mínimo 8 caracteres, com letra e número.'
    case 'perfilInvalido':
    case 'semAcesso':
      return 'Não foi possível criar sua conta. Tente novamente.'
    case 'dadosInvalidos':
    case 'loginDuplicado':
      return 'Cadastro indisponível no momento.'
    default:
      return 'Não foi possível criar sua conta. Tente novamente.'
  }
}
