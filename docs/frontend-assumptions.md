# Suposições do frontend — Equipamentos

Registro de lacunas encontradas ao montar a tela de Equipamentos. Nenhuma mudança de contrato
foi feita aqui; este documento apenas sinaliza o que falta para remover o modo de exemplo.

## Estado atual

- `EquipamentoServico.listar()` chama `window.electronAPI.equipamentos.listar()` e
  `listarCategorias()` chama `window.electronAPI.categorias.listar()`.
- Os tipos já existem em `src/shared/contratos/api.ts` (`equipamentos.listar`,
  `categorias.listar`), mas os handlers de IPC **ainda não estão registrados no main**.
- Se a chamada falhar (canal ausente), o serviço devolve dados de exemplo tipados com
  `Equipamento` e `Categoria` de `src/shared/contratos/modelos`. A tela exibe o aviso discreto
  **“dados de exemplo”** no cabeçalho.

## O que falta no contrato

### CRUD de equipamentos

Hoje há somente leitura (`equipamentos.listar`). Para a tela deixar de ser somente consulta,
faltam canais e schemas para:

| Operação  | Canal sugerido           | Entrada sugerida                                     | Retorno sugerido |
| --------- | ------------------------ | ---------------------------------------------------- | ---------------- |
| Criar     | `equipamentos.criar`     | `{ nome, categoriaId, precoDiaria, disponivel }`     | `Equipamento`    |
| Atualizar | `equipamentos.atualizar` | `{ id, nome, categoriaId, precoDiaria, disponivel }` | `Equipamento`    |
| Excluir   | `equipamentos.excluir`   | `{ id }`                                             | `void`           |

Cada canal precisa de: constante em `canais.ts`, schema Zod no main, handler fino que valide
e delegue, regra em serviço, SQL parametrizado em repositório e exposição no preload.

### Estado de conservação

O modelo `Equipamento` não possui estado de conservação. A tela de Equipamentos do mapa
(`docs/telas.md`) e a rota antiga de placeholder citavam `estadoConservacao`. É preciso
decidir:

- Novo campo no modelo compartilhado (ex.: `estadoConservacao: 'novo' | 'bom' | 'regular' | 'mau'`),
  com migração SQLite e atualização dos schemas; **ou**
- Modelo separado de manutenção, se o estado for derivado de ordens de serviço.

Enquanto não há decisão, a tela mostra apenas disponibilidade (`disponivel: boolean`) com
badge “Disponível” / “Indisponível”. Não foi inventado campo novo no renderer.

## Fora do escopo desta tela

- Filtro por disponibilidade (além da badge) — pode virar um `Select` quando houver necessidade.
- Paginação e ordenação no servidor — a `Tabela` ordena localmente por enquanto.
- edição em modal — depende do CRUD acima.
