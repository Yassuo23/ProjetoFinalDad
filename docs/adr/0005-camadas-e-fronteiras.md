# ADR 0005 — Camadas e fronteiras entre processos

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS + ED), válido para os quatro donos de módulo

## Contexto

Quatro pessoas implementam domínios diferentes no mesmo processo principal. Sem uma fronteira
explícita, regra de locação acaba dentro de handler IPC, SQL acaba dentro de serviço e o renderer
começa a importar utilitários do main. Isso torna os módulos impossíveis de testar isoladamente e
quebra o isolamento do Electron.

## Decisão

A dependência aponta sempre **do exterior para o interior**:

```
renderer ─┐
preload  ─┼─> shared/contratos (canais, tipos, estados)
main/ipc ─┘
main/ipc/handlers ─> main/servicos ─> main/repositorios ─> main/banco
```

| Pasta | Contém | Não contém |
| --- | --- | --- |
| `shared/contratos/canais.ts` | só constantes string + `type Canal`; zero imports | runtime, Zod, lógica |
| `shared/contratos/estados.ts` | `const` readonly + `type` derivado | Zod (o schema fica em `esquemas.ts`) |
| `shared/contratos/modelos.ts` | `interface`/`type` de domínio e erros | implementação |
| `shared/contratos/esquemas.ts` | schemas Zod | uso no preload (R2) |
| `shared/contratos/api.ts` | `ApiZenite`, única porta do renderer | implementação |
| `main/ipc/handlers/` | registro fino: schema + delegação | regra de negócio, SQL, janela |
| `main/servicos/` | regra de negócio, `ErroDeDominio`, porta injetável | SQL, IPC, `fetch` de UI |
| `main/repositorios/` | SQL parametrizado, type guard de linha | decisão de negócio |
| `main/banco/` | conexão, `Migrador`, migrações versionadas | regra de domínio |
| `main/seguranca/` | allowlist, navegação, CSP | regra de domínio |
| `main/janelas/` | `BrowserWindow` e `webPreferences` | handlers, negócio |
| `preload/index.ts` | `contextBridge` + `CANAIS` + tipos apagados | Zod, tratamento de erro, chave |
| `renderer/` | HTML/CSS/TS puro e tokens Zênite | Node, `ipcRenderer`, banco, `fetch` externo |

Regras de dependência:

1. Serviço **nunca** importa de `main/ipc/`, `main/janelas/` ou `main/seguranca/`.
2. Repositório **nunca** importa de `main/servicos/` — recebe dados, não decide.
3. Handler **nunca** conversa diretamente com repositório.
4. Renderer e preload só leem `shared/`, nunca `main/`.
5. Todo módulo de domínio expõe uma interface porta (`RepositorioX`, `ServicoX`) para testes com
   dublê, sem `any`.

## Alternativas descartadas

- **Serviço com SQL direto** — mistura regra e persistência; impossibilita teste unitário sem banco.
- **Handler com regra de negócio** — duplica validação entre `invoke` e `send`, e vaza detalhe de
  driver para o renderer quando o erro muda.
- **Renderer com `ipcRenderer` direto** — quebra `contextIsolation` e expõe canal arbitrário.
- **Zod no preload** — dependência de runtime sob `sandbox: true` impede a abertura do app.

## Consequências

- Cada pacote (Clientes, Equipamentos, Reservas, P9–P11) segue o molde em quatro camadas:
  repositório → serviço → handlers → renderer, um commit por camada.
- Erros de domínio são sempre `ErroDeDominio`, com `message === codigo`; o renderer traduz o código.
- Revisão de PR percorre R1–R7 e esta tabela; módulo que invade camada alheia é bloqueado.
- `EstadoEquipamento` e os demais enums têm fonte única em `shared/contratos/estados.ts`; o DDL
  com `CHECK` espelha a lista — mudança de enum exige mudança de migração.
