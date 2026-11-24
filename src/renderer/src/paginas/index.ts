export { PaginaDashboard } from './PaginaDashboard'
export { PaginaSobre } from './PaginaSobre'
export { PaginaEmConstrucao } from './PaginaEmConstrucao'
export { PaginaNaoEncontrada } from './PaginaNaoEncontrada'
export { PaginaComponentes } from './PaginaComponentes'

// Telas funcionais adaptadas ao roteador do shell.
export { PaginaArquivos } from './Arquivos'
export { PaginaCategorias } from './Categorias'
export { PaginaClientes } from './Clientes'
export { PaginaDevolucoes } from './Devolucoes'
export { PaginaEquipamentos } from './Equipamentos'
export { PaginaPagamentos } from './Pagamentos'
export { PaginaReservas } from './Reservas'
/**
 * A vitrine `PaginaEquipamentos.ts` (dados de exemplo) ficou fora das rotas:
 * a rota /equipamentos agora aponta para a tela funcional em Equipamentos.ts.
 * `EquipamentoServico.ts` permanece exportado em servicos/index.ts.
 */
