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

  auth: {
    entrar: (dados) => ipcRenderer.invoke(CANAIS.authEntrar, dados),
    sair: () => ipcRenderer.invoke(CANAIS.authSair),
    sessaoAtual: () => ipcRenderer.invoke(CANAIS.authSessaoAtual),
    bootstrap: (dados) => ipcRenderer.invoke(CANAIS.authBootstrap, dados),
    cadastrarCliente: (dados) => ipcRenderer.invoke(CANAIS.authCadastrarCliente, dados),
  },

  usuarios: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.usuariosListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.usuariosBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.usuariosCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.usuariosAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.usuariosInativar, { id }),
    alterarSenha: (dados) => ipcRenderer.invoke(CANAIS.usuariosAlterarSenha, dados),
  },

  categorias: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.categoriasListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.categoriasBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.categoriasCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.categoriasAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.categoriasInativar, { id }),
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
    listarPendentes: (data) =>
      ipcRenderer.invoke(
        CANAIS.devolucoesListarPendentes,
        data === undefined ? undefined : { data },
      ),
    calcularMulta: (dados) => ipcRenderer.invoke(CANAIS.devolucoesCalcularMulta, dados),
    criar: (dados) => ipcRenderer.invoke(CANAIS.devolucoesCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.devolucoesAtualizar, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.devolucoesInativar, { id }),
  },

  manutencao: {
    listar: (filtros) => ipcRenderer.invoke(CANAIS.manutencaoListar, filtros),
    buscarPorId: (id) => ipcRenderer.invoke(CANAIS.manutencaoBuscarPorId, { id }),
    criar: (dados) => ipcRenderer.invoke(CANAIS.manutencaoCriar, dados),
    atualizar: (dados) => ipcRenderer.invoke(CANAIS.manutencaoAtualizar, dados),
    concluir: (dados) => ipcRenderer.invoke(CANAIS.manutencaoConcluir, dados),
    inativar: (id) => ipcRenderer.invoke(CANAIS.manutencaoInativar, { id }),
  },

  integracoes: {
    previsaoTempo: (entrada) => ipcRenderer.invoke(CANAIS.integracoesPrevisaoTempo, entrada),
    cnpj: (cnpj) => ipcRenderer.invoke(CANAIS.integracoesCnpj, { cnpj }),
    feriados: (entrada) => ipcRenderer.invoke(CANAIS.integracoesFeriados, entrada),
  },

  dashboard: {
    resumo: (entrada) => ipcRenderer.invoke(CANAIS.dashboardResumo, entrada),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
