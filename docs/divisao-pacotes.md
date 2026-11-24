# Divisão dos pacotes P1–P11

Critério: afinidade de domínio e ordem de dependência. A governança é de **sete agentes** com
pastas fechadas (ADR 0018 e tabela no `AGENTS.md`); ninguém edita módulo de outro sem combinar.

## Quem entrega o quê

| Agente | Papel nos pacotes |
| --- | --- |
| `arquiteto` (AS) | fecha contrato de cada pacote em `shared/contratos/` e registra a migração em `migracoes/index.ts` |
| `especialista-desktop` (ED) | main, preload, janela, hardening, build; expõe a ponte e as portas nativas |
| `backend` | serviços POO, handlers finos e ligação no composition root |
| `database` | repositórios parametrizados e migrações `NNN-*.ts` de módulo |
| `frontend` | uma função `montarX` por módulo, TypeScript puro e CSS externo |
| `qa` | gates, testes, smoke e riscos residuais |
| `integrador` | PRs, branches, documentação e defesa |

| Domínio | Pacotes | Por quê |
| --- | --- | --- |
| Equipamentos | **P1** CRUD → **P4** Disponibilidade → **P8** Manutenção | Ciclo de vida do equipamento; P4 e P8 leem o mesmo estado do P1. |
| Cadastros | **P2** Clientes+CEP → **P3** Fornecedores+CNPJ | Integrações HTTP com a mesma estrutura de serviço no main. |
| Reserva | **P5** Reservas+Clima → **P6** Devoluções+multas → **P7** Pagamentos | Uma cadeia: reserva → devolução → quitação. P6 depende do `valorAquisicao` do P1. |
| Transversal | **P9** Feriados → **P10** Usuários+perfis → **P11** Painel | P9 repete o padrão de API; P10 e P11 fecham a entrega. |

## Ordem de execução

`P1 → P2 → P4 → P5 → P3 → P6 → P7 → P8 → P9 → P10 → P11`

A ordem dentro de cada domínio é fixa; a interleaving entre domínios pode mudar conforme a
disponibilidade, desde que as dependências sejam respeitadas.

## Pré-condição para cada pacote

O contrato precisa estar em `src/shared/contratos/` **antes** da implementação: canais → tipos →
schemas → erros → enum → migração. O dono escreve `NNN-modulo.ts` com o próximo número livre e o
AS registra no índice. Divergência de contrato não é resolvida no merge — vai para ADR.

## Situação atual

- Contratos fechados: P1–P11 (ADRs 0006, 0011–0017) e arquivos/backup/exportação (ADR 0019).
- Implementados: P1, P2, P4, P5, P6, P7 e os recursos nativos de arquivo.
- Pendentes de implementação: P3, P8, P9, P10 e P11 — nesta ordem, quatro commits por pacote
  (repositório → serviço → handlers → renderer).
