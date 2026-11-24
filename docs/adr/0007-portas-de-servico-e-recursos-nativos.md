# ADR 0007 — Portas de serviço e canais de recursos nativos

- **Status:** aceito
- **Data:** 2026-11-24
- **Decisores:** usuário (diretriz) + AS

## Contexto

Com main/preload/IPC/hardening entregues na branch `feat/electron`, os quatro devs de módulo
precisam de um alvo estável para implementar serviços sem editar handlers, e o ED precisa de
canais tipados para os recursos nativos (diálogos, banco, CSV, notificação e `safeStorage`).
As portas de infraestrutura já vivem em `src/main/nucleo/`; serviços ainda não têm contrato
comum, e cada handler novo poderia acabar definindo sua própria assinatura.

## Decisão

1. As portas de serviço são interfaces **somente tipos** em
   `src/shared/contratos/servicos.ts`, nomeadas `PortaServico<Modulo>`. Cada método recebe o
   payload já validado pelo schema do main e devolve o DTO de `modelos.ts`; nenhuma regra, SQL
   ou Electron entra no contrato.
2. `ContainerAplicacao` expõe `ProvedorServicos`, `registrarServico(nome, porta)`,
   `registrarProvedorServicos(provedor)`, `obterServico(nome)` e `obterProvedorServicos()`.
   O dono do módulo registra a implementação; o ED só delega a porta no handler.
3. Recursos nativos viram canais `nativo:*` em `canais.ts`, com payload/retorno em `modelos.ts`,
   Zod em `esquemas.ts` e um método por canal em `ApiRecursosNativos` (`api.ts`).
4. Cancelamento pelo usuário e `safeStorage` indisponível são retornos `null`, não erros;
   payload inválido é `VALIDACAO`, falha de arquivo/banco é `INTERNO`.

## Alternativas descartadas

- **Portas em `main/nucleo/` junto dos repositórios** — o ED passaria a depender de tipos de
  implementação ou a duplicar assinaturas nos handlers.
- **Portas com argumentos posicionais** — o handler teria que remontar o objeto validado pelo
  Zod antes de delegar, abrindo espaço para reinterpretação do payload.
- **`ApiZenite.nativo` obrigatório desde já** — quebraria o typecheck do preload do ED antes
  de ele publicar as funções; fica opcional até a entrega dele.
- **Erro novo para "cancelado"/"indisponível"** — exigiria mexer no mapa de erros do ED sem
  necessidade; `null` já expressa a ausência de resultado.

## Consequências

- Todo handler de domínio passa a ter assinatura previsível: `registrar(canal, schema,
  (entrada) => servico.metodo(entrada))`.
- `esquemaId` passa a existir para os canais de operação por id; `listar` reusa
  `esquemaSemEntrada`.
- `ApiZenite.nativo` é opcional até o ED implementar as nove funções no preload; depois deve
  virar obrigatório para travar o contrato.
- `src/shared/contratos/servicos.ts` não pode ganhar imports de runtime (R2/R3).
- Revisitar quando um módulo precisar de transação entre serviços: o container passa a expor
  uma unidade de trabalho em vez de portas isoladas.
