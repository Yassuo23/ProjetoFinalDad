import type {
  EnderecoCep,
  MotivoIndisponibilidade,
  RespostaCep,
} from '../../../shared/contratos/modelos'

/** Textos fixos: o renderer nunca inventa endereço nem expõe detalhe de transporte. */
const DESCRICAO_MOTIVO: Readonly<Record<MotivoIndisponibilidade, string>> = {
  SERVICO_FORA: 'o serviço está temporariamente fora',
  CREDENCIAL_AUSENTE: 'a credencial da integração não está configurada',
  SEM_DADOS: 'o serviço não devolveu dados',
  PESQUISA_INVALIDA: 'a consulta foi considerada inválida',
}

export interface AvisoCep {
  readonly titulo: string
  readonly mensagem: string
}

export type InterpretacaoCep =
  | { readonly estado: 'disponivel'; readonly endereco: EnderecoCep }
  | { readonly estado: 'nao-encontrado'; readonly aviso: AvisoCep }
  | {
      readonly estado: 'indisponivel'
      readonly motivo: MotivoIndisponibilidade
      readonly aviso: AvisoCep
    }

/** Converte o contrato público em textos; não altera formulário nem esconde o fallback manual. */
export function interpretarRespostaCep(resposta: RespostaCep): InterpretacaoCep {
  if (resposta.estado === 'disponivel') return resposta

  if (resposta.estado === 'nao-encontrado') {
    return {
      estado: 'nao-encontrado',
      aviso: {
        titulo: 'CEP não encontrado',
        mensagem: 'CEP não encontrado. Preencha o endereço manualmente.',
      },
    }
  }

  return {
    estado: 'indisponivel',
    motivo: resposta.motivo,
    aviso: {
      titulo: 'Falha ao consultar o CEP',
      mensagem: `Serviço de CEP indisponível (${resposta.motivo}): ${DESCRICAO_MOTIVO[resposta.motivo]}. Preencha o endereço manualmente.`,
    },
  }
}
