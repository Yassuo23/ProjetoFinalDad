import { app, shell } from 'electron'
import type { PortaCicloBanco } from '../../banco/CicloBanco'
import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import { CategoriaRepositorio } from '../../repositorios/CategoriaRepositorio'
import { ClienteRepositorio } from '../../repositorios/ClienteRepositorio'
import { DevolucaoRepositorio } from '../../repositorios/DevolucaoRepositorio'
import { EquipamentoRepositorio } from '../../repositorios/EquipamentoRepositorio'
import { PagamentoRepositorio } from '../../repositorios/PagamentoRepositorio'
import { ReservaRepositorio } from '../../repositorios/ReservaRepositorio'
import type { PortaArquivos } from '../../seguranca/ArquivosNativos'
import { urlExternaPermitida } from '../../seguranca/UrlsExternas'
import { ArquivosServico } from '../../servicos/ArquivosServico'
import { BackupServico } from '../../servicos/BackupServico'
import { ClimaServico } from '../../servicos/ClimaServico'
import { DevolucaoServico } from '../../servicos/DevolucaoServico'
import { DisponibilidadeServico } from '../../servicos/DisponibilidadeServico'
import { CepServico } from '../../servicos/CepServico'
import { ClienteServico } from '../../servicos/ClienteServico'
import { ErroDeDominio } from '../../servicos/ErroDominio'
import { ExportacaoServico } from '../../servicos/ExportacaoServico'
import { MultaServico } from '../../servicos/MultaServico'
import { PagamentoServico } from '../../servicos/PagamentoServico'
import { CategoriaServico } from '../../servicos/CategoriaServico'
import { EquipamentoServico } from '../../servicos/EquipamentoServico'
import { ReservaServico } from '../../servicos/ReservaServico'
import type { RegistroIpc } from '../RegistroIpc'
import { registrarArquivos } from './arquivos'
import { registrarBackup } from './backup'
import { registrarCategorias } from './categorias'
import { registrarClientes } from './clientes'
import { registrarDevolucoes } from './devolucoes'
import { registrarEquipamentos } from './equipamentos'
import { registrarExportacao } from './exportacao'
import { registrarPagamentos } from './pagamentos'
import { registrarReservas } from './reservas'

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
export function registrarHandlers(
  registro: RegistroIpc,
  ciclo: PortaCicloBanco,
  arquivos: PortaArquivos,
): void {
  const db = ciclo.db

  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => obterAppInfo())

  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url) => {
    if (!urlExternaPermitida(url)) {
      throw new ErroDeDominio('URL_NAO_PERMITIDA', 'Endereço externo não permitido.')
    }
    await shell.openExternal(url)
  })

  const categorias = new CategoriaRepositorio(db)
  const clientes = new ClienteRepositorio(db)

  const equipamentos = new EquipamentoRepositorio(db)
  const reservas = new ReservaRepositorio(db)
  const disponibilidade = new DisponibilidadeServico(reservas, equipamentos)

  registrarCategorias(registro, new CategoriaServico(categorias))
  registrarClientes(registro, new ClienteServico(clientes), new CepServico())
  registrarEquipamentos(
    registro,
    new EquipamentoServico(equipamentos, categorias, disponibilidade),
    disponibilidade,
  )
  registrarReservas(
    registro,
    new ReservaServico(reservas, clientes, equipamentos, disponibilidade),
    new ClimaServico(),
  )
  registrarDevolucoes(
    registro,
    new DevolucaoServico(
      new DevolucaoRepositorio(db),
      reservas,
      equipamentos,
      new MultaServico(),
    ),
  )
  registrarPagamentos(registro, new PagamentoServico(new PagamentoRepositorio(db), reservas))

  registrarArquivos(registro, new ArquivosServico(arquivos))
  registrarBackup(
    registro,
    new BackupServico(ciclo, arquivos, [
      app.getPath('documents'),
      app.getPath('downloads'),
      app.getPath('userData'),
    ]),
  )
  registrarExportacao(registro, new ExportacaoServico(arquivos))
}
