# ADR 0015 — Contrato do P9 (Feriados)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS), implementação a cargo do agente Backend/Database

## Contexto

A locadora precisa do calendário de feriados para informar ao operador e, no futuro, compor a
precificação. O P9 repete o padrão de API externa dos serviços de CEP/CNPJ.

## Decisão

1. **Canais:** `feriados:listar`, `buscar-por-id`, `criar`, `atualizar`, `remover` e `importar`.
2. **Fonte externa:** `FeriadoServico` consulta BrasilAPI `/feriados/v1/{ano}` no main;
   `brasilapi.com.br` já está na allowlist. `importar(ano, uf?)` mescla resultados sem apagar
   feriados `personalizado` criados à mão.
3. **Identidade:** `(data, uf)` único, com `uf = ''` para feriado nacional (SQLite não compara
   `NULL` como igual em `UNIQUE`). Conflito devolve `FERIADO_JA_EXISTENTE`.
4. **Feriados NÃO alteram disponibilidade nem multa neste pacote.** Regra de locação usa só o
   período da reserva (ADRs 0008 e 0010); acoplar feriado agora mexeria em dois módulos alheios.
5. **Migração:** `008-feriados`.
6. **Erros:** `FERIADO_NAO_ENCONTRADO`, `FERIADO_JA_EXISTENTE`, `FERIADOS_INDISPONIVEIS`.

## Alternativas descartadas

- **Buscar feriados no renderer** — R3 e CSP de produção.
- **Usar feriado para recalcular a diária** — mudaria regra de preço já fechada no P1 sem
  aprovação de produto.

## Consequências

- `ApiZenite`/preload expõem `feriados.*`.
- `FeriadoServico` tem o mesmo risco de timeout de `CepServico`/CNPJ.
- Risco residual: decidir no futuro se feriado entra em disponibilidade/preço exige nova ADR.
