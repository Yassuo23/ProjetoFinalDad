import { app, shell } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import { CategoriaRepositorio } from '../../repositorios/CategoriaRepositorio'
import { CategoriaServico } from '../../servicos/CategoriaServico'
import type { RegistroIpc } from '../RegistroIpc'
import { registrarCategorias } from './categorias'

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
    await shell.openExternal(url)
  })

  registrarCategorias(registro, new CategoriaServico(new CategoriaRepositorio(db)))
}
