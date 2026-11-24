# Decisões tomadas com apoio de agentes de IA

Registro de onde agentes (AS, ED, BD, BE, IA, UX, FE) influenciaram a arquitetura e por quê.
Nada aqui substitui ADR: decisões estruturais estão em `docs/adr/`.

| Decisão | Agente(s) | Por quê |
| --- | --- | --- |
| Contrato em constantes string, sem `const enum` | AS | `const enum` some em runtime e quebra quando o preload é bundlado; ADR 0002. |
| Zod só no main; preload importa só `canais.ts` | AS + ED | `sandbox: true` não deixa o preload carregar dependência local; validação no main. |
| `node:sqlite` em vez de `better-sqlite3` | AS + BD | Evita rebuild de ABI; evidência: Electron 45.4.1 / Node 24.22.3 (ADR 0003). |
| Migrador com transação manual e rollback | BD | Garante que falha parcial não deixa esquema pela metade; teste `:memory:`. |
| Tailwind v4 pelo plugin do Vite (não PostCSS) | UX + AS | Peer do Vite 8 atendido; menos arquivos de config (ADR 0004). |
| Renderer permanece TS puro, não React | humano + AS | Trabalho do FE já entregue; reescrita não agregaria valor (ADR 0006). |
| Erro de domínio com mensagem pública + detalhe interno | AS + BE | Evita vazar stack/SQL ao renderer e mantém código tipado (ADR 0005). |
| ContainerAplicacao como composition root | AS + BE + BD | Injeção de dependência permite trocar repositório sem tocar no serviço. |
| 62 canais declarados antes da implementação | AS | Contrato fechado primeiro evita 4 devs criando strings soltas. |
| Regras de locação como PERGUNTAS, não números inventados | AS | Cliente não definiu carência, multa nem fronteira de dia; `docs/dominio.md`. |

## Avaliação de MCP (Model Context Protocol)

**Conclusão: não precisa, nesta etapa.**

- O contrato main/preload/renderer já é local, tipado e versionado em `src/shared/contratos/`.
  MCP adicionaria uma camada de transporte entre agentes sem resolver nenhum problema atual.
- As integrações externas (CEP, clima, CNPJ, feriados) são HTTP comuns no processo principal
  e serão encapsuladas em `src/main/integracoes/` com Zod e erro tipado; não exigem MCP.
- Revisitar se os 4 devs passarem a rodar em máquinas distintas e precisarem de um barramento
  comum de contexto — ainda assim, o contrato versionado continua sendo a fonte da verdade.

## Avaliação de RAG (Retrieval Augmented Generation)

**Conclusão: não precisa, nesta etapa.**

- O conhecimento relevante é pequeno e determinístico: 1 arquivo de requisitos do cliente,
  6 ADRs, 1 guia de padrões e 1 documento de domínio. Cabe inteiro no contexto de qualquer
  agente; busca vetorial introduziria risco de recuperar decisão revogada.
- O custo de manter índice, embeddings e sincronização não se justifica para ~15 documentos.
- Revisitar se `docs/` ultrapassar algumas dezenas de documentos ou se decidirmos indexar
  histórico de PRs e decisões antigas. Até lá, ADRs com status (aceito/substituído) são o
  mecanismo de recuperação.

## Uso real dos agentes no projeto

Os 7 papéis estão em `.opencode/agents/` e as 3 skills em `.opencode/skills/`. O fluxo é:
AS define contrato → ED registra no Electron → BD cria tabelas/repositórios → BE escreve
serviço → IA integra APIs → UX/FE entregam tela. Cada handoff é uma mensagem explícita,
não uma suposição de que "o outro agente já fez".

