import { contextBridge, ipcRenderer } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { ApiZenite } from '../shared/contratos/api'
import type { PingPayload } from '../shared/contratos/modelos'

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
}

contextBridge.exposeInMainWorld('electronAPI', api)
