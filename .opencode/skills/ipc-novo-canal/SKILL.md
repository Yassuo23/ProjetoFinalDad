---
name: IPC — novo canal
description: Adiciona um canal IPC ponta a ponta no padrão da fundação (contrato, schema, handler, serviço, preload, renderer)
---

# Adicionar um canal IPC

Só comece com o contrato fechado: nome do canal, payload, retorno e erros. Sem isso,
pare e peça ao AS.

## Passos

1. **Contrato** — adicione a constante string em `src/shared/contratos/canais.ts`, dentro de
   `CANAIS`. Nenhum literal de canal pode existir fora desse arquivo.
2. **Tipos** — payload e retorno em `src/shared/contratos/modelos.ts`. Só `type`/`interface`.
3. **Schema** — em `src/shared/contratos/esquemas.ts`, com Zod. Esse arquivo **nunca** é
   importado pelo preload.
4. **Handler** — registre em `src/main/ipc/handlers/` via `RegistroIpc.registrar(canal,
   esquema, tratar)`. O handler valida e delega; não decide regra.
5. **Serviço** — regra de negócio em `src/main/servicos/`, em classe com dependências
   injetadas no construtor.
6. **Repositório** — se houver dado, SQL parametrizado em `src/main/repositorios/`.
7. **Preload** — importe apenas `canais.ts` e tipos (`import type`). Exponha uma função
   específica em `window.electronAPI`; nada de `ipcRenderer` genérico no renderer.
8. **Renderer** — chame a função tipada. Trate erro sem exibir detalhe interno.

## Verificação

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
```

Confira `dist/preload/index.js`: ele **não pode** conter `require("../shared/...")`.
O preload é empacotado; qualquer dependência local vira require e quebra sob `sandbox: true`.

## Proibido

- Zod ou qualquer lib com runtime no preload.
- `any`, literal de canal solto, handler com SQL ou regra de negócio.
- Expor `ipcRenderer.invoke` cru para o renderer.
