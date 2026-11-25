import './tailwind.css'
import { AreaConteudo, Cabecalho, Sidebar } from './layout'
import { criarElemento, Roteador, substituirConteudo } from './nucleo'
import type { FabricaPagina } from './nucleo'
import {
  PaginaClientes,
  PaginaComponentes,
  PaginaDashboard,
  PaginaDevolucoes,
  PaginaEmConstrucao,
  PaginaEquipamentos,
  PaginaFornecedores,
  PaginaNaoEncontrada,
  PaginaPagamentos,
  PaginaReservas,
  PaginaSobre,
} from './paginas'

const root = document.querySelector<HTMLDivElement>('#app')

if (!root) {
  throw new Error('Root element #app was not found')
}

const ROTAS = new Map<string, FabricaPagina>([
  ['/dashboard', () => new PaginaDashboard()],
  ['/equipamentos', () => new PaginaEquipamentos()],
  ['/clientes', () => new PaginaClientes()],
  ['/fornecedores', () => new PaginaFornecedores()],
  [
    '/manutencao',
    () => new PaginaEmConstrucao('Manutenção', 'manutencao.listar · manutencao.abrir'),
  ],
  ['/reservas', () => new PaginaReservas()],
  ['/devolucoes', () => new PaginaDevolucoes()],
  ['/pagamentos', () => new PaginaPagamentos()],
  ['/sobre', () => new PaginaSobre()],
  ['/404', () => new PaginaNaoEncontrada()],
])

const TITULOS = new Map<string, string>([
  ['/dashboard', 'Dashboard'],
  ['/equipamentos', 'Equipamentos'],
  ['/clientes', 'Clientes'],
  ['/fornecedores', 'Fornecedores'],
  ['/manutencao', 'Manutenção'],
  ['/reservas', 'Reservas'],
  ['/devolucoes', 'Devoluções'],
  ['/pagamentos', 'Pagamentos'],
  ['/sobre', 'Sobre'],
  ['/404', 'Página não encontrada'],
])

if (import.meta.env.DEV) {
  ROTAS.set('/componentes', () => new PaginaComponentes())
  TITULOS.set('/componentes', 'Componentes')
}

const shell = criarElemento('div', {
  className: 'flex h-screen overflow-hidden bg-pedra font-sans text-grafite',
})

const sidebarSlot = criarElemento('div', { className: 'flex shrink-0' })
const coluna = criarElemento('div', { className: 'flex min-w-0 flex-1 flex-col' })
const cabecalhoSlot = criarElemento('div', { className: 'shrink-0' })
const conteudoSlot = criarElemento('div', { className: 'flex min-h-0 flex-1 flex-col' })

coluna.append(cabecalhoSlot, conteudoSlot)
shell.append(sidebarSlot, coluna)
substituirConteudo(root, shell)

const sidebar = new Sidebar()
sidebar.montar(sidebarSlot)

const cabecalho = new Cabecalho('Dashboard')
cabecalho.montar(cabecalhoSlot)

const areaConteudo = new AreaConteudo()
areaConteudo.montar(conteudoSlot)

const roteador = new Roteador(areaConteudo.raiz, ROTAS, (caminho) => {
  cabecalho.definirTitulo(TITULOS.get(caminho) ?? 'Zênite')
  sidebar.definirAtivo(caminho)
})

roteador.iniciar()
