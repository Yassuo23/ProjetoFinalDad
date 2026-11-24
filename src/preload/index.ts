import { contextBridge, ipcRenderer } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { ApiZenite } from '../shared/contratos/api'
import type {
  BackupRestaurarEntrada,
  DialogoAbrirEntrada,
  DialogoSalvarEntrada,
  ExportacaoCsvEntrada,
  PingPayload,
} from '../shared/contratos/modelos'

const api: ApiZenite = {
  appInfo: () => ipcRenderer.invoke(CANAIS.appInfo),

  abrirExterno: (url) => ipcRenderer.invoke(CANAIS.abrirExterno, url),

  onPing: (callback) => {
    const listener = (_evento: Electron.IpcRendererEvent, payload: PingPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(CANAIS.ping, listener)
    return () => ipcRenderer.removeListener(CANAIS.ping, listener)
  },

  arquivos: {
    abrir: (entrada: DialogoAbrirEntrada = {}) => ipcRenderer.invoke(CANAIS.arquivosAbrir, entrada),
    salvar: (entrada: DialogoSalvarEntrada = {}) =>
      ipcRenderer.invoke(CANAIS.arquivosSalvar, entrada),
  },

  backup: {
    criar: () => ipcRenderer.invoke(CANAIS.backupCriar),
    restaurar: (entrada: BackupRestaurarEntrada) =>
      ipcRenderer.invoke(CANAIS.backupRestaurar, entrada),
  },

  exportacao: {
    csv: (entrada: ExportacaoCsvEntrada) => ipcRenderer.invoke(CANAIS.exportacaoCsv, entrada),
  },

  categorias: { listar: () => ipcRenderer.invoke(CANAIS.categoriasListar) },

  clientes: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.clientesListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.clientesBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.clientesCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.clientesAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.clientesInativar, { id }),
    consultarCep: (entrada) => ipcRenderer.invoke(CANAIS.clientesConsultarCep, entrada),
  },

  equipamentos: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.equipamentosListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.equipamentosBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.equipamentosCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.equipamentosAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.equipamentosInativar, { id }),
    listarDisponiveis: (periodo) =>
      ipcRenderer.invoke(CANAIS.equipamentosListarDisponiveis, periodo),
    verificarDisponibilidade: (entrada) =>
      ipcRenderer.invoke(CANAIS.equipamentosVerificarDisponibilidade, entrada),
  },

  reservas: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.reservasListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.reservasBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.reservasCriar, dados),
    confirmar: (id) => ipcRenderer.invoke(CANAIS.reservasConfirmar, { id }),
    cancelar: (id) => ipcRenderer.invoke(CANAIS.reservasCancelar, { id }),
    previsaoTempo: (entrada) => ipcRenderer.invoke(CANAIS.reservasPrevisaoTempo, entrada),
  },

  devolucoes: {
    registrar: (dados) => ipcRenderer.invoke(CANAIS.devolucoesRegistrar, dados),
    buscarPorReserva: (reservaId) =>
      ipcRenderer.invoke(CANAIS.devolucoesBuscarPorReserva, { reservaId }),
  },

  multas: { calcular: (entrada) => ipcRenderer.invoke(CANAIS.multasCalcular, entrada) },

  pagamentos: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.pagamentosListar, filtros),
    buscarPorReserva: (reservaId) =>
      ipcRenderer.invoke(CANAIS.pagamentosBuscarPorReserva, { reservaId }),
    registrar: (dados) => ipcRenderer.invoke(CANAIS.pagamentosRegistrar, dados),
    confirmar: (id) => ipcRenderer.invoke(CANAIS.pagamentosConfirmar, { id }),
    estornar: (id) => ipcRenderer.invoke(CANAIS.pagamentosEstornar, { id }),
  },

  fornecedores: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.fornecedoresListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.fornecedoresBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.fornecedoresCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.fornecedoresAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.fornecedoresInativar, { id }),
    consultarCnpj: (entrada) => ipcRenderer.invoke(CANAIS.fornecedoresConsultarCnpj, entrada),
  },

  manutencoes: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.manutencoesListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.manutencoesBuscarPorId, { id }),
    abrir: (dados) => ipcRenderer.invoke(CANAIS.manutencoesAbrir, dados),
    concluir: (dados) => ipcRenderer.invoke(CANAIS.manutencoesConcluir, dados),
  },

  feriados: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.feriadosListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.feriadosBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.feriadosCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.feriadosAtualizar, dados),
    remover: (id) => ipcRenderer.invoke(CANAIS.feriadosRemover, { id }),
    importar: (dados) => ipcRenderer.invoke(CANAIS.feriadosImportar, dados),
  },

  usuarios: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.usuariosListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.usuariosBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.usuariosCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.usuariosAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.usuariosInativar, { id }),
    autenticar: (entrada) => ipcRenderer.invoke(CANAIS.usuariosAutenticar, entrada),
  },

  painel: {
    resumo: (filtros) => ipcRenderer.invoke(CANAIS.painelResumo, filtros),
    porCategoria: (filtros) => ipcRenderer.invoke(CANAIS.painelPorCategoria, filtros),
    receita: (filtros) => ipcRenderer.invoke(CANAIS.painelReceita, filtros),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
