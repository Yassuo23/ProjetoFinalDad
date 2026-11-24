# ADR 0005 — Camadas e programação orientada a objetos

- **Status:** aceito
- **Data:** 2026-11-24
- **Decisores:** fundação (AS + ED), com aporte dos agentes de backend e banco

## Contexto

Nove módulos de negócio serão implementados por devs diferentes no mesmo repositório. Sem
fronteiras explícitas, aparecem três falhas previsíveis: regra de locação dentro de handler
IPC, SQL montado no renderer e `new` de repositório espalhado pelo main. A base já trazia
`RegistroIpc`, `ConexaoBanco` e `Migrador`, mas nenhuma convenção de classe, erro ou injeção.

## Decisão

1. A cadeia é fixa: `renderer → preload → IPC (canal + schema) → handler → serviço → repositório → SQLite`.
2. Regra de negócio em `class Servico<Entidade>` com dependências injetadas no construtor.
3. Acesso a dados em `class Repositorio<Entidade>` com `DatabaseSync` injetado; SQL sempre
   parametrizado (R6).
4. `src/main/nucleo/ContainerAplicacao.ts` é o composition root: único lugar com `new` de
   repositórios/serviços. O main do ED apenas chama o container.
5. `ErroDominio` (em `src/main/nucleo/erros.ts`) é a base abstrata; `mensagemPublica` cruza a
   ponte, `detalheInterno` fica no log do main. Código do erro é tipado (`CodigoErroDominio`).
6. Convenções e mapa de dependências escritos em `docs/padroes-codigo.md`.

## Alternativas descartadas

- **Funções soltas e `throw new Error(string)`** — perdem código tipado, vazam `stack` e
  impedem teste com porta falsa.
- **Serviço que instancia seu próprio repositório** — acopla regra ao SQLite e quebra o teste
  unitário; a injeção no container resolve.
- **Regra no handler ou no repositório** — viola R5/R7 e espalha política de locação.
- **Classe base de erro em `shared/contratos/`** — conteria runtime (`extends Error`) e
  poderia ser importada por engano no preload; foi para `main/nucleo`.

## Consequências

- Todo módulo novo precisa registrar sua fábrica no container e implementar a porta
  `Repositorio<T>`; o AS revisa essa ligação, o dono revisa a regra.
- Erros de IPC passam a ter formato único (`ErroApi`), sem detalhe interno.
- `Equipamento.estado` ficou opcional no tipo compartilhado para não quebrar os dados de
  exemplo do renderer legado; dívida técnica a resolver quando o FE atualizar a tela.
- Revisitar quando surgir módulo que precise de transação entre dois repositórios (ex.:
  reserva + pagamento) — nesse caso o container deverá expor uma unidade de trabalho.

