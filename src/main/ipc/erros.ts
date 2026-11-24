import type { Canal } from '../../shared/contratos/canais'
import type { CodigoErroDominio, ErroApi } from '../../shared/contratos/modelos'
import { eErroDominio } from '../nucleo/erros'

/**
 * Fronteira de erro do IPC. O detalhe (Zod, SQL, driver, stack) fica no log do
 * main; o renderer recebe apenas código, mensagem pública e canal.
 */
export function paraErroApi(erro: unknown, canal: Canal): ErroApi {
  let codigo: CodigoErroDominio = 'INTERNO'
  let mensagem = 'Falha interna. Tente novamente.'

  if (eErroDominio(erro)) {
    codigo = erro.codigo
    mensagem = erro.mensagemPublica
  } else if (erro instanceof Error && erro.name === 'ZodError') {
    codigo = 'VALIDACAO'
    mensagem = 'Dados invalidos para esta operacao.'
  } else if (erro instanceof Error && erro.message.startsWith('IPC_INVALIDO:')) {
    codigo = 'VALIDACAO'
    mensagem = 'Dados invalidos para esta operacao.'
  }

  console.error(`[zenite:ipc] ${canal}`, erro)
  return { codigo, mensagem, canal }
}
