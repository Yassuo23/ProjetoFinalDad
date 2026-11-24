import { contextBridge, ipcRenderer } from 'electron'
import { CANAIS } from '../shared/contratos/canais'
import type { Canal } from '../shared/contratos/canais'
import type { ApiZenite } from '../shared/contratos/api'
import type {
  AppInfo,
  Categoria,
  Cliente,
  DadosCnpj,
  Devolucao,
  EnderecoViaCep,
  Equipamento,
  Feriado,
  Fornecedor,
  Manutencao,
  Pagamento,
  PingPayload,
  PrevisaoClima,
  Reserva,
  Usuario,
  ValorMulta,
} from '../shared/contratos/modelos'

/** Única forma de invocar o main. Nenhum `ipcRenderer` cru é exposto. */
function invocar<T>(canal: Canal, ...argumentos: unknown[]): Promise<T> {
  return ipcRenderer.invoke(canal, ...argumentos) as Promise<T>
}

const api: ApiZenite = {
  appInfo: () => invocar<AppInfo>(CANAIS.appInfo),
  abrirExterno: (url) => invocar<void>(CANAIS.abrirExterno, url),

  onPing: (callback) => {
    const listener = (_evento: Electron.IpcRendererEvent, payload: PingPayload): void => {
      callback(payload)
    }
    ipcRenderer.on(CANAIS.ping, listener)
    return () => ipcRenderer.removeListener(CANAIS.ping, listener)
  },

  categorias: {
    listar: () => invocar<Categoria[]>(CANAIS.categoriasListar),
    obter: (id) => invocar<Categoria>(CANAIS.categoriasObter, { id }),
    criar: (nome, descricao) =>
      invocar<Categoria>(CANAIS.categoriasCriar, { nome, descricao }),
    atualizar: (id, nome, descricao) =>
      invocar<Categoria>(CANAIS.categoriasAtualizar, { id, nome, descricao }),
    excluir: (id) => invocar<void>(CANAIS.categoriasExcluir, { id }),
  },

  equipamentos: {
    listar: () => invocar<Equipamento[]>(CANAIS.equipamentosListar),
    obter: (id) => invocar<Equipamento>(CANAIS.equipamentosObter, { id }),
    criar: (nome, categoriaId, precoDiaria, estado) =>
      invocar<Equipamento>(CANAIS.equipamentosCriar, {
        nome,
        categoriaId,
        precoDiaria,
        estado,
      }),
    atualizar: (id, nome, categoriaId, precoDiaria, estado) =>
      invocar<Equipamento>(CANAIS.equipamentosAtualizar, {
        id,
        nome,
        categoriaId,
        precoDiaria,
        estado,
      }),
    excluir: (id) => invocar<void>(CANAIS.equipamentosExcluir, { id }),
    disponiveis: (inicio, fim, categoriaId) =>
      invocar<Equipamento[]>(CANAIS.equipamentosDisponiveis, {
        inicio,
        fim,
        categoriaId,
      }),
  },

  clientes: {
    listar: () => invocar<Cliente[]>(CANAIS.clientesListar),
    obter: (id) => invocar<Cliente>(CANAIS.clientesObter, { id }),
    criar: (nome, email, telefone) =>
      invocar<Cliente>(CANAIS.clientesCriar, { nome, email, telefone }),
    atualizar: (id, nome, email, telefone) =>
      invocar<Cliente>(CANAIS.clientesAtualizar, { id, nome, email, telefone }),
    excluir: (id) => invocar<void>(CANAIS.clientesExcluir, { id }),
  },

  fornecedores: {
    listar: () => invocar<Fornecedor[]>(CANAIS.fornecedoresListar),
    obter: (id) => invocar<Fornecedor>(CANAIS.fornecedoresObter, { id }),
    criar: (razaoSocial, cnpj, contato, telefone) =>
      invocar<Fornecedor>(CANAIS.fornecedoresCriar, {
        razaoSocial,
        cnpj,
        contato,
        telefone,
      }),
    atualizar: (id, razaoSocial, cnpj, contato, telefone) =>
      invocar<Fornecedor>(CANAIS.fornecedoresAtualizar, {
        id,
        razaoSocial,
        cnpj,
        contato,
        telefone,
      }),
    excluir: (id) => invocar<void>(CANAIS.fornecedoresExcluir, { id }),
  },

  reservas: {
    listar: () => invocar<Reserva[]>(CANAIS.reservasListar),
    obter: (id) => invocar<Reserva>(CANAIS.reservasObter, { id }),
    criar: (clienteId, equipamentoId, inicio, fim) =>
      invocar<Reserva>(CANAIS.reservasCriar, { clienteId, equipamentoId, inicio, fim }),
    atualizar: (id, clienteId, equipamentoId, inicio, fim) =>
      invocar<Reserva>(CANAIS.reservasAtualizar, {
        id,
        clienteId,
        equipamentoId,
        inicio,
        fim,
      }),
    confirmar: (id) => invocar<Reserva>(CANAIS.reservasConfirmar, { id }),
    cancelar: (id) => invocar<Reserva>(CANAIS.reservasCancelar, { id }),
  },

  devolucoes: {
    listar: () => invocar<Devolucao[]>(CANAIS.devolucoesListar),
    obter: (id) => invocar<Devolucao>(CANAIS.devolucoesObter, { id }),
    registrar: (reservaId, devolvidaEm, estadoRecebido, observacoes) =>
      invocar<Devolucao>(CANAIS.devolucoesRegistrar, {
        reservaId,
        devolvidaEm,
        estadoRecebido,
        observacoes,
      }),
    calcularMulta: (reservaId, devolvidaEm) =>
      invocar<ValorMulta>(CANAIS.devolucoesCalcularMulta, { reservaId, devolvidaEm }),
  },

  pagamentos: {
    listar: () => invocar<Pagamento[]>(CANAIS.pagamentosListar),
    obter: (id) => invocar<Pagamento>(CANAIS.pagamentosObter, { id }),
    registrar: (reservaId, valor, pagoEm, forma, observacoes) =>
      invocar<Pagamento>(CANAIS.pagamentosRegistrar, {
        reservaId,
        valor,
        pagoEm,
        forma,
        observacoes,
      }),
    baixar: (id) => invocar<Pagamento>(CANAIS.pagamentosBaixar, { id }),
  },

  manutencoes: {
    listar: () => invocar<Manutencao[]>(CANAIS.manutencoesListar),
    obter: (id) => invocar<Manutencao>(CANAIS.manutencoesObter, { id }),
    abrir: (equipamentoId, fornecedorId, descricao) =>
      invocar<Manutencao>(CANAIS.manutencoesAbrir, {
        equipamentoId,
        fornecedorId,
        descricao,
      }),
    concluir: (id, concluidaEm) =>
      invocar<Manutencao>(CANAIS.manutencoesConcluir, { id, concluidaEm }),
  },

  usuarios: {
    listar: () => invocar<Usuario[]>(CANAIS.usuariosListar),
    obter: (id) => invocar<Usuario>(CANAIS.usuariosObter, { id }),
    criar: (nome, login, perfil) =>
      invocar<Usuario>(CANAIS.usuariosCriar, { nome, login, perfil }),
    atualizar: (id, nome, perfil, ativo) =>
      invocar<Usuario>(CANAIS.usuariosAtualizar, { id, nome, perfil, ativo }),
    autenticar: (login, senha) =>
      invocar<Usuario>(CANAIS.usuariosAutenticar, { login, senha }),
  },

  integracoes: {
    buscarCep: (cep) => invocar<EnderecoViaCep>(CANAIS.cepBuscar, { cep }),
    previsaoClima: (data, local) =>
      invocar<PrevisaoClima>(CANAIS.climaPrevisao, { data, local }),
    buscarCnpj: (cnpj) => invocar<DadosCnpj>(CANAIS.cnpjBuscar, { cnpj }),
    feriados: (ano, uf) => invocar<Feriado[]>(CANAIS.feriadosListar, { ano, uf }),
  },
}

contextBridge.exposeInMainWorld('electronAPI', api)
