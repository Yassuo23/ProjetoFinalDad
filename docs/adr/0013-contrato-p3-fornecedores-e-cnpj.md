# ADR 0013 — Contrato do P3 (Fornecedores e CNPJ)

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS), implementação a cargo do agente Backend/Database (Dev B)

## Contexto

O P2 fechou o padrão "cadastro + API externa" para Clientes/CEP. Fornecedores repetem o molde
com CNPJ; a regra precisa ser idêntica para não criar duas arquiteturas paralelas.

## Decisão

1. **Canais:** `fornecedores:listar`, `buscar-por-id`, `criar`, `atualizar`, `inativar` e
   `consultar-cnpj`. Todos com schema no main.
2. **Modelo:** `Fornecedor` com `razaoSocial`, `nomeFantasia`, `cnpj`, `email`, `telefone`, `cep`,
   `cidade`, `uf` e `ativo` (inativação lógica, como Cliente). Consulta externa devolve
   `DadosCnpj`, sem `id` e sem `ativo`.
3. **CNPJ:** BrasilAPI (`/cnpj/v1/{digitos}`) no `FornecedorServico` no main; `viacep` já é usado
   no P2 e `brasilapi.com.br` já está na allowlist. Nenhuma chamada no renderer.
4. **Regras:** CNPJ válido (14 dígitos, máscara opcional), único por fornecedor ativo; duplicata
   devolve `CNPJ_DUPLICADO`. Consulta sem resultado devolve `CNPJ_NAO_ENCONTRADO`; falha de rede
   cai no mesmo código, como `CepServico`.
5. **Migração:** `010-fornecedores`, criada pelo dono do módulo, com `cnpj TEXT NOT NULL UNIQUE`
   e `ativo INTEGER`. O contrato foi fechado antes da DDL; road map de migrações é atualizado no
   commit do repositório de Fornecedores.
6. **Erros novos:** `FORNECEDOR_NAO_ENCONTRADO`, `CNPJ_INVALIDO`, `CNPJ_NAO_ENCONTRADO`,
   `CNPJ_DUPLICADO`.

## Alternativas descartadas

- **Reutilizar a tabela `clientes`** — Clientes e Fornecedores têm conjuntos de dados e regras
  diferentes; um discriminador criaria `cliente_id` nulo em metade das linhas.
- **Consultar CNPJ no renderer** — quebraria R3 e a CSP de produção.

## Consequências

- `ApiZenite` e o preload expõem `fornecedores.*`; nenhum outro módulo é afetado.
- `FornecedorServico` segue o mesmo padrão de injeção de repositório de `ClienteServico`.
- Risco residual: timeout explícito no `fetch` do CNPJ, mesmo problema já registrado no CEP.
