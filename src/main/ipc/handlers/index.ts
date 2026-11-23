import { app, shell } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import { CategoriaRepositorio } from '../../repositorios/CategoriaRepositorio'
import { ClienteRepositorio } from '../../repositorios/ClienteRepositorio'
import { EquipamentoRepositorio } from '../../repositorios/EquipamentoRepositorio'
import { urlExternaPermitida } from '../../seguranca/UrlsExternas'
import { CepServico } from '../../servicos/CepServico'
import { ClienteServico } from '../../servicos/ClienteServico'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import { CategoriaServico } from '../../servicos/CategoriaServico'
import { EquipamentoServico } from '../../servicos/EquipamentoServico'
import type { RegistroIpc } from '../RegistroIpc'
import { registrarCategorias } from './categorias'
import { registrarClientes } from './clientes'
import { registrarEquipamentos } from './equipamentos'

function obterAppInfo(): AppInfo {
  return {
    name: app.getName(),
    version: app.getVersion(),
    electron: process.versions.electron,
    node: process.versions.node,
    platform: process.platform,
    arch: process.arch,
  }
}

/** Ponto único de registro de handlers do processo principal. */
export function registrarHandlers(registro: RegistroIpc, db: DatabaseSync): void {
  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => obterAppInfo())

  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url) => {
    if (!urlExternaPermitida(url)) {
      throw new ErroDeDominio('URL_NAO_PERMITIDA', 'Endereço externo não permitido.')
    }
    await shell.openExternal(url)
  })

  const categorias = new CategoriaRepositorio(db)
  const clientes = new ClienteRepositorio(db)

  registrarCategorias(registro, new CategoriaServico(categorias))
  registrarClientes(registro, new ClienteServico(clientes), new CepServico())
  registrarEquipamentos(
    registro,
    new EquipamentoServico(new EquipamentoRepositorio(db), categorias),
  )
}
