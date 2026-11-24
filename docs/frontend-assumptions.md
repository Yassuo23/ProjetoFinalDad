# Suposições do frontend

Registro de lacunas encontradas ao montar as telas do renderer. Nenhuma mudança de contrato foi
feita aqui; este documento apenas sinaliza o que falta para remover o modo de exemplo.

## Equipamentos

### Estado atual

- `EquipamentoServico.listar()` chama `window.electronAPI.equipamentos.listar()` e
  `listarCategorias()` chama `window.electronAPI.categorias.listar()`.
- Os tipos já existem em `src/shared/contratos/api.ts` (`equipamentos.listar`,
  `categorias.listar`), mas os handlers de IPC **ainda não estão registrados no main**.
- Se a chamada falhar (canal ausente), o serviço devolve dados de exemplo tipados com
  `Equipamento` e `Categoria` de `src/shared/contratos/modelos`. A tela exibe o aviso discreto
  **“dados de exemplo”** no cabeçalho.

### O que falta no contrato

#### CRUD de equipamentos

Hoje há somente leitura (`equipamentos.listar`). Para a tela deixar de ser somente consulta,
faltam canais e schemas para:

| Operação  | Canal sugerido           | Entrada sugerida                                     | Retorno sugerido |
| --------- | ------------------------ | ---------------------------------------------------- | ---------------- |
| Criar     | `equipamentos.criar`     | `{ nome, categoriaId, precoDiaria, disponivel }`     | `Equipamento`    |
| Atualizar | `equipamentos.atualizar` | `{ id, nome, categoriaId, precoDiaria, disponivel }` | `Equipamento`    |
| Excluir   | `equipamentos.excluir`   | `{ id }`                                             | `void`           |

Cada canal precisa de: constante em `canais.ts`, schema Zod no main, handler fino que valide
e delegue, regra em serviço, SQL parametrizado em repositório e exposição no preload.

#### Estado de conservação

O modelo `Equipamento` não possui estado de conservação. A tela de Equipamentos do mapa
(`docs/telas.md`) e a rota antiga de placeholder citavam `estadoConservacao`. É preciso
decidir:

- Novo campo no modelo compartilhado (ex.: `estadoConservacao: 'novo' | 'bom' | 'regular' | 'mau'`),
  com migração SQLite e atualização dos schemas; **ou**
- Modelo separado de manutenção, se o estado for derivado de ordens de serviço.

Enquanto não há decisão, a tela mostra apenas disponibilidade (`disponivel: boolean`) com
badge “Disponível” / “Indisponível”. Não foi inventado campo novo no renderer.

### Fora do escopo desta tela

- Filtro por disponibilidade (além da badge) — pode virar um `Select` quando houver necessidade.
- Paginação e ordenação no servidor — a `Tabela` ordena localmente por enquanto.
- edição em modal — depende do CRUD acima.

## Dashboard

### Estado atual

- `DashboardServico.carregar()` tenta `window.electronAPI.reservas.listar()`,
  `window.electronAPI.clientes.listar()` e reutiliza `EquipamentoServico.listar()` (que já possui
  fallback próprio). Nenhuma string de canal aparece no renderer.
- Se qualquer fonte falhar, o painel inteiro usa o conjunto de exemplo tipado com `Reserva` e
  `Cliente` do contrato e com os equipamentos devolvidos pelo próprio `EquipamentoServico`. O
  resultado expõe `dadosDeExemplo: true`.
- A tela exibe uma faixa discreta com “dados de exemplo / offline” e continua renderizando os
  KPIs, a agenda, o clima e a frota. `EstadoErro` fica reservado a uma falha inesperada do
  próprio serviço agregador.
- A coluna “Tipo” da agenda é derivada de `Reserva.inicio`/`Reserva.fim` comparados com a data local:
  `fim === hoje` significa devolução; caso contrário, retirada. O horário é ilustrativo somente no
  conjunto de exemplo — em dados reais a célula mostra “—”.

### Tipos locais do renderer

Nenhum campo novo foi acrescentado a `src/shared/contratos`. Os tipos abaixo vivem em
`src/renderer/src/servicos/DashboardServico.ts`:

| Tipo local                             | Uso na tela                                     | Lacuna no contrato / endpoint                                                                                                                                        |
| -------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PagamentoItem`, `StatusPagamento`     | coluna “Pagamento / Multa” e KPI de faturamento | faltam `pagamentos.listar` e `multas.calcular` (com modelo de pagamento)                                                                                             |
| `PrevisaoTempo`, `CondicaoClima`       | card “Previsão do tempo”                        | falta `clima.previsao` — chamada HTTP deve ser feita no main, com allowlist; por isso `previsaoExemplo` é sempre `true` e o card está marcado como “exemplo”         |
| `StatusFrota.manutencao`               | contador “Manutenção”                           | `Equipamento` só tem `disponivel: boolean`; falta `estadoConservacao` ou `manutencao.listar`. Com dados reais o valor é `null` e a tela mostra “—”; no exemplo é `1` |
| `Faturamento.estimado`                 | KPI “Faturamento do dia”                        | sem canal de pagamentos, o valor real é estimado pela diária dos equipamentos das reservas de hoje e identificado com badge “estimativa”                             |
| `DevolucaoPendente.atrasada`, `.multa` | KPI “Devoluções pendentes” e destaque de atraso | faltam `devolucoes.listarPendentes`, `multas.calcular` e vínculo `Reserva` → devolução                                                                               |
| horário da agenda                      | coluna “Horário”                                | `Reserva` não possui campo de horário; necessário novo campo no modelo e no schema                                                                                   |

### Handoff

Os canais/models acima precisam ser decididos pelo Arquiteto e expostos pelo ED. Até lá, a tela
permanece 100% tipada no renderer, sem acesso a Node, SQL ou strings de canal.
