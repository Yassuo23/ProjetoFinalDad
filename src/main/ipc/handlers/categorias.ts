import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { ServicoCategorias } from '../../servicos/CategoriaServico'
import type { RegistroIpc } from '../RegistroIpc'

/** Handler fino: valida a entrada pelo schema e delega ao serviço. */
export function registrarCategorias(registro: RegistroIpc, servico: ServicoCategorias): void {
  registro.registrar(CANAIS.categoriasListar, esquemaSemEntrada, async () => servico.listar())
}
