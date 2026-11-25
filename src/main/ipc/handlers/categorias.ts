import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { ServicoCategorias } from '../../servicos/portas'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida pelo schema e delega. Nenhuma regra nem SQL aqui. */
export function registrarCategorias(registro: RegistroIpc, servico: ServicoCategorias): void {
  registro.registrar(CANAIS.categoriasListar, esquemaSemEntrada, async () => servico.listar())
}
