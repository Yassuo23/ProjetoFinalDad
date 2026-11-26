export { Componente } from './Componente'
export { Roteador } from './Roteador'
export type { FabricaPagina, GuardiaoRota } from './Roteador'
export { criarElemento, criarIcone, criarIlustracao, substituirConteudo } from './dom'
export type { OpcoesElemento } from './dom'
export {
  ROTULOS_PERFIL,
  clienteVinculado,
  ehAdministrador,
  ehCliente,
  idClienteVinculado,
  observarPerfil,
  perfilAtivo,
} from './Perfil'
export type { Perfil } from './Perfil'
export { definirSessao, limparSessao, observarSessao, sessaoAtiva } from './Sessao'
export {
  ROTA_404,
  ROTA_CADASTRO_CLIENTE,
  ROTA_CLIENTE_DISPONIBILIDADE,
  ROTA_CLIENTE_MINHAS_RESERVAS,
  ROTA_CLIENTE_NOVA_RESERVA,
  ROTA_DASHBOARD,
  ROTA_ESCOLHA_CONTA,
  ROTA_LOGIN,
  ROTA_PRIMEIRA_EXECUCAO,
  ROTAS_CLIENTE,
  ROTAS_PUBLICAS,
  consumirRotaPendente,
  destinoAutenticada,
  destinoGuardiao,
  ehRotaCliente,
  ehRotaPublica,
  guardarRotaPendente,
  limparRotaPendente,
  resolverDestinoInicial,
} from './ControleAcesso'
export type { DestinoInicial, ResultadoSessaoInicial } from './ControleAcesso'
export { registrarAtalhos } from './Atalhos'
export type { AcoesAtalhos } from './Atalhos'
