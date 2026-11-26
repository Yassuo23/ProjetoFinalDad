import './tailwind.css'
import type { EstadoSessao, Sessao } from '../../shared/contratos/modelos'
import { Botao, Carregando, EstadoErro, Modal } from './componentes'
import { AreaConteudo, Cabecalho, Sidebar } from './layout'
import {
  ROTA_404,
  ROTA_ACESSO_RESTRITO,
  ROTA_CADASTRO_CLIENTE,
  ROTA_CLIENTE_DISPONIBILIDADE,
  ROTA_CLIENTE_MINHAS_RESERVAS,
  ROTA_CLIENTE_NOVA_RESERVA,
  ROTA_DASHBOARD,
  ROTA_ESCOLHA_CONTA,
  ROTA_LOGIN,
  ROTA_PRIMEIRA_EXECUCAO,
  Roteador,
  consumirRotaPendente,
  criarElemento,
  definirSessao,
  destinoGuardiao,
  ehRotaCliente,
  ehRotaPublica,
  guardarRotaPendente,
  limparRotaPendente,
  limparSessao,
  substituirConteudo,
} from './nucleo'
import type { FabricaPagina, GuardiaoRota } from './nucleo'
import {
  PaginaAcessoRestrito,
  PaginaCategorias,
  PaginaClientes,
  PaginaComponentes,
  PaginaDashboard,
  PaginaCadastroCliente,
  PaginaDevolucoes,
  PaginaDisponibilidadeCliente,
  PaginaEquipamentos,
  PaginaEscolhaConta,
  PaginaFornecedores,
  PaginaLogin,
  PaginaManutencao,
  PaginaNaoEncontrada,
  PaginaPagamentos,
  PaginaPrimeiraExecucao,
  PaginaReservas,
  PaginaSobre,
  PaginaUsuarios,
} from './paginas'
import { EVENTO_SESSAO_EXPIRADA, ServicoAutenticacao } from './servicos'

/** A sessão expira no main (8h por padrão); aqui só se decide para onde voltar. */
const MENSAGEM_SESSAO_EXPIRADA = 'Sua sessão expirou. Entre novamente.'
const INTERVALO_VERIFICACAO_SESSAO_MS = 15_000

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Root element #app was not found')
}

/** Classes literais do shell — o Tailwind não enxerga valores concatenados. */
const CLASSES = {
  shell: 'flex h-screen overflow-hidden bg-pedra font-sans text-grafite',
  sidebarSlot: 'flex shrink-0',
  cabecalhoSlot: 'shrink-0',
  conteudoSlot: 'flex min-h-0 flex-1 flex-col',
  oculto: 'hidden',
  ajudaLista: 'grid grid-cols-1 gap-2 text-sm text-grafite',
  ajudaLinha: 'flex items-center justify-between gap-4 border-b border-granito/30 pb-1',
  ajudaTecla: 'font-semibold text-floresta',
} as const

const ROTAS = new Map<string, FabricaPagina>([
  ['/dashboard', () => new PaginaDashboard()],
  ['/equipamentos', () => new PaginaEquipamentos()],
  ['/clientes', () => new PaginaClientes()],
  ['/fornecedores', () => new PaginaFornecedores()],
  ['/categorias', () => new PaginaCategorias()],
  ['/manutencao', () => new PaginaManutencao()],
  ['/reservas', () => new PaginaReservas('consulta')],
  ['/reservas/nova', () => new PaginaReservas('novo')],
  ['/devolucoes', () => new PaginaDevolucoes()],
  ['/pagamentos', () => new PaginaPagamentos()],
  ['/usuarios', () => new PaginaUsuarios()],
  ['/sobre', () => new PaginaSobre()],
  [
    ROTA_CLIENTE_DISPONIBILIDADE,
    () => new PaginaDisponibilidadeCliente(),
  ],
  [
    ROTA_CLIENTE_MINHAS_RESERVAS,
    () => new PaginaReservas('consulta', { modoCliente: true }),
  ],
  [
    ROTA_CLIENTE_NOVA_RESERVA,
    () => new PaginaReservas('novo', { modoCliente: true }),
  ],
  [
    ROTA_ESCOLHA_CONTA,
    () =>
      new PaginaEscolhaConta({
        aoAdministrador: () => {
          window.location.hash = `#${ROTA_LOGIN}`
        },
        aoCliente: () => {
          window.location.hash = `#${ROTA_CADASTRO_CLIENTE}`
        },
      }),
  ],
  [
    ROTA_CADASTRO_CLIENTE,
    () =>
      new PaginaCadastroCliente({
        aoCriar: aplicarSessao,
        aoVoltar: () => {
          window.location.hash = `#${ROTA_ESCOLHA_CONTA}`
        },
        aoEntrar: () => {
          window.location.hash = `#${ROTA_LOGIN}`
        },
      }),
  ],
  [
    ROTA_LOGIN,
    () => new PaginaLogin({ aoEntrar: aplicarSessao, avisoInicial: avisoLogin }),
  ],
  [
    ROTA_PRIMEIRA_EXECUCAO,
    () => new PaginaPrimeiraExecucao({ aoCriar: aplicarSessao }),
  ],
  [ROTA_ACESSO_RESTRITO, () => new PaginaAcessoRestrito()],
  [ROTA_404, () => new PaginaNaoEncontrada()],
])

const ATALHOS: readonly (readonly [string, string])[] = [
  ['Ctrl + N', 'Novo cadastro na tela atual'],
  ['Ctrl + K', 'Focar a busca'],
  ['F5', 'Recarregar a lista'],
  ['F2', 'Editar o item selecionado'],
  ['Enter', 'Confirmar o formulário'],
  ['Ctrl + Enter', 'Confirmar o diálogo aberto'],
  ['Esc', 'Cancelar a operação'],
  ['? ou F1', 'Abrir esta ajuda'],
]

const TITULOS = new Map<string, string>([
  ['/dashboard', 'Dashboard'],
  ['/equipamentos', 'Equipamentos'],
  ['/clientes', 'Clientes'],
  ['/fornecedores', 'Fornecedores'],
  ['/categorias', 'Categorias'],
  ['/manutencao', 'Manutenção'],
  ['/reservas', 'Reservas'],
  ['/reservas/nova', 'Nova reserva'],
  ['/devolucoes', 'Devoluções'],
  ['/pagamentos', 'Pagamentos'],
  ['/usuarios', 'Usuários'],
  ['/sobre', 'Sobre'],
  [ROTA_CLIENTE_DISPONIBILIDADE, 'Disponibilidade'],
  [ROTA_CLIENTE_MINHAS_RESERVAS, 'Minhas reservas'],
  [ROTA_CLIENTE_NOVA_RESERVA, 'Nova reserva'],
  [ROTA_ESCOLHA_CONTA, 'Escolha de conta'],
  [ROTA_CADASTRO_CLIENTE, 'Cadastro de cliente'],
  [ROTA_LOGIN, 'Login'],
  [ROTA_PRIMEIRA_EXECUCAO, 'Primeira execução'],
  [ROTA_ACESSO_RESTRITO, 'Acesso restrito'],
  [ROTA_404, 'Página não encontrada'],
])

if (import.meta.env.DEV) {
  ROTAS.set('/componentes', () => new PaginaComponentes())
  TITULOS.set('/componentes', 'Componentes')
}

const shell = criarElemento('div', { className: CLASSES.shell })
const sidebarSlot = criarElemento('div', { className: CLASSES.sidebarSlot })
const coluna = criarElemento('div', { className: CLASSES.conteudoSlot })
const cabecalhoSlot = criarElemento('div', { className: CLASSES.cabecalhoSlot })
const conteudoSlot = criarElemento('div', { className: CLASSES.conteudoSlot })

coluna.append(cabecalhoSlot, conteudoSlot)
shell.append(sidebarSlot, coluna)
substituirConteudo(root, shell)

const servico = new ServicoAutenticacao()
/** Espelho local do estado do main; nunca substitui a autorização do IPC. */
let estado: EstadoSessao = { estado: 'anonima' }
let avisoLogin: string | null = null

const sidebar = new Sidebar()
sidebar.montar(sidebarSlot)

const cabecalho = new Cabecalho('Dashboard', {
  aoSair: () => {
    void sair()
  },
})
cabecalho.montar(cabecalhoSlot)

const areaConteudo = new AreaConteudo()
areaConteudo.montar(conteudoSlot)

/** Só decisão de navegação: o main continua validando perfil em cada canal. */
const guardiao: GuardiaoRota = (caminho) => {
  const permitido = destinoGuardiao(estado, caminho)
  if (permitido === caminho) {
    return permitido
  }
  if (estado.estado === 'anonima') {
    guardarRotaPendente(caminho)
  }
  return permitido
}

/** Rota pós-login/bcadastro: nunca devolve rota pública ou do outro perfil. */
function destinoAposEntrada(sessao: Sessao): string {
  const pendente = consumirRotaPendente()
  if (sessao.perfil === 'Cliente') {
    return ROTA_CLIENTE_DISPONIBILIDADE
  }
  return ehRotaCliente(pendente) ? ROTA_DASHBOARD : pendente
}

const roteador = new Roteador(
  areaConteudo.raiz,
  ROTAS,
  (caminho) => {
    const publica = ehRotaPublica(caminho)
    sidebarSlot.className = publica ? CLASSES.oculto : CLASSES.sidebarSlot
    cabecalhoSlot.className = publica ? CLASSES.oculto : CLASSES.cabecalhoSlot
    cabecalho.definirTitulo(TITULOS.get(caminho) ?? 'Zênite')
    sidebar.definirAtivo(caminho)
  },
  guardiao,
)

let modalAjuda: Modal | null = null

function abrirAjuda(): void {
  if (modalAjuda !== null) {
    return
  }
  const linhas = ATALHOS.map(([tecla, descricao]) =>
    criarElemento('div', {
      className: CLASSES.ajudaLinha,
      filhos: [
        criarElemento('span', { className: CLASSES.ajudaTecla, texto: tecla }),
        criarElemento('span', { texto: descricao }),
      ],
    }),
  )
  const fechar = new Botao({
    texto: 'Fechar',
    variante: 'secundario',
    aoClicar: () => {
      modalAjuda?.fechar()
      modalAjuda = null
    },
  })
  modalAjuda = new Modal({
    id: 'ajuda-atalhos',
    titulo: 'Atalhos de teclado',
    conteudo: criarElemento('div', {
      className: CLASSES.ajudaLista,
      filhos: linhas,
    }),
    rodape: [fechar.raiz],
    aoFechar: () => {
      modalAjuda = null
    },
  })
  modalAjuda.abrir()
}

document.addEventListener('keydown', (evento: KeyboardEvent): void => {
  if (evento.ctrlKey || evento.metaKey || evento.altKey) {
    return
  }
  if (evento.key !== '?' && evento.key !== 'F1') {
    return
  }
  const alvo = evento.target
  if (alvo instanceof HTMLElement && alvo.matches('input, select, textarea')) {
    return
  }
  evento.preventDefault()
  abrirAjuda()
})

function aplicarSessao(sessao: Sessao): void {
  avisoLogin = null
  definirSessao(sessao)
  estado = { estado: 'autenticada', sessao }
  roteador.navegar(destinoAposEntrada(sessao))
}

async function sair(): Promise<void> {
  try {
    await servico.sair()
  } catch {
    // Mesmo se o IPC falhar, a sessão local é descartada por segurança.
  }
  estado = { estado: 'anonima' }
  limparSessao()
  limparRotaPendente()
  roteador.navegar(ROTA_ESCOLHA_CONTA)
}

/**
 * Expiração é diferente de "sair": o main encerrou a sessão, então voltamos ao
 * Login com aviso — nunca à escolha de conta, que é o fluxo de quem nunca entrou.
 */
function encerrarSessaoExpirada(): void {
  if (estado.estado !== 'autenticada') {
    return
  }
  estado = { estado: 'anonima' }
  limparSessao()
  limparRotaPendente()
  avisoLogin = MENSAGEM_SESSAO_EXPIRADA
  roteador.navegar(ROTA_LOGIN)
}

/** Sessão expirada em repouso: nenhum IPC foi chamado, mas o main já a encerrou. */
async function verificarSessao(): Promise<void> {
  if (estado.estado !== 'autenticada') {
    return
  }
  try {
    const atual = await servico.sessaoAtual()
    if (estado.estado === 'autenticada' && atual.estado !== 'autenticada') {
      encerrarSessaoExpirada()
    }
  } catch {
    // Falha de transporte não encerra a sessão local: a próxima chamada dirá.
  }
}

let temporizadorSessao: number | null = null
window.addEventListener(EVENTO_SESSAO_EXPIRADA, () => {
  encerrarSessaoExpirada()
})

async function iniciar(): Promise<void> {
  sidebarSlot.className = CLASSES.oculto
  cabecalhoSlot.className = CLASSES.oculto
  substituirConteudo(
    areaConteudo.raiz,
    new Carregando({ mensagem: 'Verificando sua sessão…' }).raiz,
  )

  try {
    const resultado = await servico.sessaoAtual()
    estado = resultado
    definirSessao(resultado.estado === 'autenticada' ? resultado.sessao : null)
  } catch {
    estado = { estado: 'anonima' }
    definirSessao(null)
    substituirConteudo(
      areaConteudo.raiz,
      new EstadoErro({
        titulo: 'Não foi possível verificar sua sessão.',
        mensagem: 'Não foi possível carregar a sessão. Tente novamente.',
        aoTentar: () => {
          void iniciar()
        },
      }).raiz,
    )
    return
  }

  roteador.iniciar()
  if (temporizadorSessao === null) {
    temporizadorSessao = window.setInterval(() => {
      void verificarSessao()
    }, INTERVALO_VERIFICACAO_SESSAO_MS)
  }
}

void iniciar()
