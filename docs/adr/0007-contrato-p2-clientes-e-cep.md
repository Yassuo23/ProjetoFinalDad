# ADR 0007 — Contrato do P2 (Clientes + CEP)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS), implementação a cargo da Dev B

> ADR 0005 (camadas) segue reservado para o C9. Esta ADR fecha só o contrato; nenhuma regra de
> locação é decidida aqui.

## Contexto

A revisão do conjunto P1+C8 encontrou `clientes:listar` e `reservas:listar` no registro e na ponte
sem schema e sem handler (R4). O contrato do P2 precisava existir antes de a Dev B começar o módulo,
e o pacote inclui consulta de CEP — integração externa que não pode ser feita no renderer.

## Decisão

1. **Canais do P2:** `clientes:listar` (filtros opcionais `nome` e `ativo`), `buscar-por-id`,
   `criar`, `atualizar`, `inativar` e `consultar-cep`. Todos em `canais.ts`; schemas Zod só no main.
2. **Modelo:** `Cliente` passa a ter endereço estruturado (`cep`, `logradouro`, `numero`,
   `complemento`, `bairro`, `cidade`, `uf`) e `ativo: boolean`. Inativação é lógica: cliente com
   histórico de reserva nunca é apagado.
3. **CEP:** `consultarCep(cep)` roda no main. `CepServico` usa **ViaCEP como fonte primária** e
   **BrasilAPI como fallback**, ambos já na allowlist de `UrlsExternas`. O renderer recebe um
   `Endereco` pronto — nunca faz `fetch` nem escolhe provedor. CEP aceito com ou sem hífen;
   a normalização para dígitos é do serviço.
4. **Erros de domínio:** `CLIENTE_NAO_ENCONTRADO`, `EMAIL_DUPLICADO`, `CEP_INVALIDO` e
   `CEP_NAO_ENCONTRADO`, todos no union `CodigoErroDominio`; o IPC transporta o código em
   `Error.message` e o renderer traduz.
5. **Migração:** `003-clientes` cria a tabela com `email UNIQUE` (múltiplos `NULL` permitidos) e
   índice por nome.
6. **`reservas:listar` sai do registro** até o contrato do P5 existir. É uma correção de R4:
   canal sem schema e sem handler não pode estar exposto na ponte.

## Alternativas descartadas

- **Buscar CEP no renderer** — quebraria R3 e exigiria `connect-src` externo na CSP de produção.
- **CEP como campo único de texto** — P5/previsão do tempo e emissão de documentos precisam de UF
  e cidade separadas.
- **Excluir cliente com reserva** — apagaria o histórico e quebraria a rastreabilidade de locação.
- **Deixar `reservas:listar` órfão "até o P5"** — R4 é inviolável; canal exposto sem handler falha
  em runtime e dá falsa sensação de contrato fechado.

## Consequências

- `api.ts` expõe seis funções em `clientes` e nenhuma em `reservas`; o preload acompanhou a
  mudança (só `CANAIS` + tipos apagados, nenhum import de Zod).
- Os canais `clientes:*` têm schema, mas ainda não têm handler até o commit de implementação da
  Dev B. Não chamar a API do renderer nesse intervalo. Handoff ao ED/Dev B: repositório, serviço,
  `CepServico` com ViaCEP/BrasilAPI e handlers finos.
- `Migrador.test.ts` passa a esperar três migrações aplicadas.
- Revisitar a escolha ViaCEP/BrasilAPI quando a Dev B integrar: se algum provedor mudar de domínio,
  a allowlist em `UrlsExternas.ts` precisa ser atualizada no mesmo commit.
