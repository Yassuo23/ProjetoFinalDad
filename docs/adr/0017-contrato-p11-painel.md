# ADR 0017 — Contrato do P11 (Painel)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS), implementação a cargo do agente Frontend com Backend/Database

## Contexto

Operador e administrador precisam ver o estado da locadora sem varrer quatro telas. O painel é
agregação de dados já persistidos por P1–P10 — não deve virar uma quinta fonte de verdade.

## Decisão

1. **Canais:** `painel:resumo`, `painel:por-categoria` e `painel:receita`, todos com o mesmo filtro
   opcional `{ ano?: number }`.
2. **Conteúdo:** `ResumoPainel` traz contagens de equipamentos (ativos, disponíveis, em manutenção),
   reservas (pendentes, confirmadas, concluídas), clientes ativos e valores (locação, multas,
   recebido). `ItemPorCategoria` e `ItemReceita` são séries para tabela.
3. **Onde a agregação mora:** `PainelRepositorio` executa `SELECT` com `GROUP BY` e `?` (R6);
   `PainelServico` só compõe os resultados. **Nenhuma regra de negócio e nenhum `fetch`** no painel.
4. **Valores:** `valorLocacao = Σ precoDiaria × dias` das reservas concluídas; `valorMultas =
   Σ devolucoes.valor_multa`; `valorRecebido = Σ pagamentos.valor WHERE status = 'pago'`. O painel
   lê o que foi persistido, não recalcula a multa (ADR 0010).
5. **Migração:** nenhuma. **Erros novos:** nenhum.
6. **Renderer:** tela única em `src/renderer/src/paginas/Painel.ts`, sem biblioteca de gráficos;
   tabelas HTML e classes CSS, preservando a CSP de produção.

## Alternativas descartadas

- **Calcular no renderer a partir de listas** — exigiria expor todas as tabelas na ponte e
  quebraria R3/R6.
- **Tabela materializada de relatórios** — duplicaria dados e exigiria nova migração sem ganho
  no volume local.
- **Biblioteca de gráficos** — dependência nova, estilos inline e risco de CSP.

## Consequências

- `ApiZenite`/preload expõem `painel.*`; nenhum módulo de negócio é alterado.
- O painel herda os filtros de `ano`; se o operador precisar de filtro por categoria, adicionar
  ao contrato antes de implementar.
