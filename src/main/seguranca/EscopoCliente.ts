import type { Sessao } from '../../shared/contratos/modelos'
import { ErroDeDominio } from '../servicos/ErroDeDominio'
import type { ProvedorSessao } from '../servicos/portas'

/**
 * ADR 0009 — autorização por propriedade no processo principal.
 *
 * O valor devolvido é sempre derivado da sessão em memória:
 * - `undefined` → staff (Administrador/Atendente), sem filtro adicional;
 * - `number` → id do cliente dono da sessão, acrescentado como `WHERE` no SQL;
 * - sessão sem vínculo de Cliente → `NAO_ENCONTRADO` (fail-closed).
 *
 * Nenhum id vem do renderer. Um recurso fora do escopo não devolve
 * `SEM_PERMISSAO`: isso confirmaria que ele existe.
 */
export function idClienteDaSessao(provedor: ProvedorSessao): number | undefined {
  const sessao: Sessao | null = provedor.sessao()
  if (sessao === null || sessao.perfil !== 'Cliente') return undefined

  const id = sessao.clienteId
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw new ErroDeDominio('NAO_ENCONTRADO', 'Registro não encontrado.')
  }
  return id
}
