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

  categorias: {
    listar: () => ipcRenderer.invoke(CANAIS.categoriasListar),
  },

  fornecedores: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.fornecedoresListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.fornecedoresBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.fornecedoresCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.fornecedoresAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.fornecedoresInativar, { id }),
  },

  clientes: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.clientesListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.clientesBuscarPorId, { id }),
    buscarCep: (cep) => ipcRenderer.invoke(CANAIS.clientesBuscarCep, { cep }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.clientesCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.clientesAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.clientesInativar, { id }),
  },

  equipamentos: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.equipamentosListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.equipamentosBuscarPorId, { id }),
    listarDisponiveis: (periodo) =>
      ipcRenderer.invoke(CANAIS.equipamentosListarDisponiveis, periodo),
    criar: (dados) => ipcRenderer.invoke(CANAIS.equipamentosCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.equipamentosAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.equipamentosInativar, { id }),
  },

  reservas: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.reservasListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.reservasBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.reservasCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.reservasAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.reservasInativar, { id }),
  },

  itensReserva: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.itensReservaListar, filtros),
    buscarPorId: (chave) => ipcRenderer.invoke(CANAIS.itensReservaBuscarPorId, chave),
    criar: (dados) => ipcRenderer.invoke(CANAIS.itensReservaCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.itensReservaAtualizar, dados),
    remover: (chave) => ipcRenderer.invoke(CANAIS.itensReservaRemover, chave),
  },

  pagamentos: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.pagamentosListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.pagamentosBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.pagamentosCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.pagamentosAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.pagamentosInativar, { id }),
  },

  devolucoes: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.devolucoesListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.devolucoesBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.devolucoesCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.devolucoesAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.devolucoesInativar, { id }),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
