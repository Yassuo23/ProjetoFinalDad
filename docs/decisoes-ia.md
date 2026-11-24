# Decisões de IA — Zênite

Registro de como agentes de IA participaram do projeto e por que certas tecnologias foram
avaliadas e descartadas. Não é substituto das ADRs: decisões de arquitetura ficam em
[`docs/adr/`](adr/).

## 1. Onde a IA foi usada

| Fase | Uso | Controle humano |
| --- | --- | --- |
| Fundação | Contrato IPC, camadas, ADRs e padrões | AS decidiu e registrou cada ADR |
| C0–C9 | Stack, SQLite, migrações e hardening | gates + revisão R1–R7 antes do commit |
| P1–P11 | Contrato primeiro; repositório → serviço → handler → renderer | dono do módulo revisou a regra |
| Integração | Revisão de PR, docs e defesa | QA e Integrador conferem evidências |

Sete agentes especializados vivem em `.opencode/agents/` (ADR 0018). Cada um tem permissões
explícitas: nenhum faz push direto, nenhum reescreve histórico e nenhum edita `shared/contratos/`
fora do Arquiteto.

## 2. Por que contrato antes de código

O skill `ipc-novo-canal` exige canais, payloads, schemas, erros e migração fechados antes da
implementação. Isso evitou o problema clássico de quatro devs inventarem a mesma string de canal
com nomes diferentes. A fonte única é `src/shared/contratos/canais.ts`; Zod fica no main porque o
preload roda sob `sandbox: true`.

## 3. Avaliação de MCP (Model Context Protocol)

**Decisão: não adotar MCP nesta entrega.**

- **Pró:** padronizaria a exposição de ferramentas ("consultar CEP", "consultar clima") para
  diferentes agentes e permitiria reutilizar as integrações fora do Electron.
- **Contra:** o app é desktop local, com quatro integrações HTTP bem definidas e contrato IPC
  próprio. Um servidor MCP acrescentaria outro processo, outro contrato e nova superfície de
  ataque sem ganho funcional; a CSP de produção também não aceitaria `ws:` do transporte MCP.
- **Quando reconsiderar:** se as consultas externas passarem a ser usadas por mais de um produto
  ou por assistentes externos. Aí o MCP deve rodar no main, atrás da mesma allowlist.

## 4. Avaliação de RAG (Retrieval-Augmented Generation)

**Decisão: não adotar RAG nesta entrega.**

- **Pró:** útil para responder perguntas sobre o acervo de ADRs, manuais e histórico de decisões.
- **Contra:** o volume documental é pequeno e totalmente versionado no Git; busca por texto e as
  ADRs resolvem. RAG exigiria embeddings, índice vetorial, dados fora do repositório e uma política
  de atualização — tudo isso sem benefício para a regra de negócio da locadora.
- **Quando reconsiderar:** se o suporte ao operador precisar de busca semântica sobre manuais e
  histórico de reservas; nesse caso o índice deve ser local e derivado do banco, sem enviar dados
  do cliente para serviços externos.

## 5. Limites da IA no projeto

- IA não decide regra de locação (prazo, multa, disponibilidade): o produto decide, o AS registra
  em ADR e o Backend implementa.
- IA não aprova segurança: `sandbox`, `contextIsolation`, allowlist e CSP são revisados por humano.
- Todo código gerado passa pelos quatro gates (`lint`, `typecheck`, `test`, `build`) antes de
  virar commit. Um commit que não compila não é mergeável, independentemente de quem o escreveu.
