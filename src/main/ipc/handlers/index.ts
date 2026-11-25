import { app, shell } from 'electron'
import { CANAIS } from '../../../shared/contratos/canais'
import { esquemaAbrirExterno, esquemaSemEntrada } from '../../../shared/contratos/esquemas'
import type { AppInfo } from '../../../shared/contratos/modelos'
import type { ConexaoBanco } from '../../banco/ConexaoBanco'
import { CategoriaRepositorio } from '../../repositorios/CategoriaRepositorio'
import { ClienteRepositorio } from '../../repositorios/ClienteRepositorio'
import { DevolucaoRepositorio } from '../../repositorios/DevolucaoRepositorio'
import { EquipamentoRepositorio } from '../../repositorios/EquipamentoRepositorio'
import { FornecedorRepositorio } from '../../repositorios/FornecedorRepositorio'
import { ItemReservaRepositorio } from '../../repositorios/ItemReservaRepositorio'
import { PagamentoRepositorio } from '../../repositorios/PagamentoRepositorio'
import { ReservaRepositorio } from '../../repositorios/ReservaRepositorio'
import { urlExternaPermitida } from '../../seguranca/UrlsExternas'
import { CepServico } from '../../servicos/CepServico'
import { CategoriaServico } from '../../servicos/CategoriaServico'
import { ClienteServico } from '../../servicos/ClienteServico'
import { ClimaServico } from '../../servicos/ClimaServico'
import { DevolucaoServico } from '../../servicos/DevolucaoServico'
import { DisponibilidadeServico } from '../../servicos/DisponibilidadeServico'
import { EquipamentoServico } from '../../servicos/EquipamentoServico'
import { ErroDeDominio } from '../../servicos/ErroDeDominio'
import { FornecedorServico } from '../../servicos/FornecedorServico'
import { ItemReservaServico } from '../../servicos/ItemReservaServico'
import { PagamentoServico } from '../../servicos/PagamentoServico'
import { ReservaServico } from '../../servicos/ReservaServico'
import type { RegistroIpc } from '../RegistroIpc'
import { registrarCategorias } from './categorias'
import { registrarClientes } from './clientes'
import { registrarDevolucoes } from './devolucoes'
import { registrarEquipamentos } from './equipamentos'
import { registrarFornecedores } from './fornecedores'
import { registrarItensReserva } from './itensReserva'
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

/** Ponto único de composição: repositório → serviço → handler. */
export function registrarHandlers(registro: RegistroIpc, conexao: ConexaoBanco): void {
  registro.registrar(CANAIS.appInfo, esquemaSemEntrada, async () => obterAppInfo())
  registro.registrar(CANAIS.abrirExterno, esquemaAbrirExterno, async (url) => {
    if (!urlExternaPermitida(url)) {
      throw new ErroDeDominio('URL_NAO_PERMITIDA', 'Endereço externo não permitido.')
    }
    await shell.openExternal(url)
  })

  const categoriasRepo = new CategoriaRepositorio(conexao)
  const fornecedoresRepo = new FornecedorRepositorio(conexao)
  const clientesRepo = new ClienteRepositorio(conexao)
  const equipamentosRepo = new EquipamentoRepositorio(conexao)
  const reservasRepo = new ReservaRepositorio(conexao)
  const itensRepo = new ItemReservaRepositorio(conexao)
  const pagamentosRepo = new PagamentoRepositorio(conexao)
  const devolucoesRepo = new DevolucaoRepositorio(conexao)

  const cep = new CepServico()
  const clima = new ClimaServico()
  const disponibilidade = new DisponibilidadeServico(equipamentosRepo)

  const fornecedores = new FornecedorServico(fornecedoresRepo)
  const clientes = new ClienteServico(clientesRepo, cep)
  const equipamentos = new EquipamentoServico(equipamentosRepo, fornecedoresRepo, disponibilidade)
  const reservas = new ReservaServico(reservasRepo, clientesRepo, disponibilidade, clima)
  const itens = new ItemReservaServico(
    itensRepo,
    reservasRepo,
    equipamentosRepo,
    disponibilidade,
  )
  const pagamentos = new PagamentoServico(pagamentosRepo, reservasRepo)
  const devolucoes = new DevolucaoServico(devolucoesRepo, reservasRepo)

  registrarCategorias(registro, new CategoriaServico(categoriasRepo))
  registrarFornecedores(registro, fornecedores)
  registrarClientes(registro, clientes)
  registrarEquipamentos(registro, equipamentos)
  registrarReservas(registro, reservas)
  registrarItensReserva(registro, itens)
  registrarPagamentos(registro, pagamentos)
  registrarDevolucoes(registro, devolucoes)
}
