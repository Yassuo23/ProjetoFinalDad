# ADR 0002 — Contrato de comunicação e empacotamento do preload

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS + ED)

## Contexto

O contrato antigo vivia em `src/shared/ipc.ts` como `const enum IpcChannels`. O comentário do
arquivo afirmava que o enum era inlinado e que o preload sandboxed nunca precisaria de outro
arquivo em runtime. Isso é frágil: `const enum` é apagado na compilação, não existe como valor
em runtime e deixa de funcionar assim que o preload é transpilado por outra ferramenta ou
precisa do nome do canal fora de uma posição inlinável.

Ao mesmo tempo, `sandbox: true` impede o preload de fazer `require` de arquivos locais. Um
objeto de constantes importado do shared vira `require("../shared/...")` no bundle do preload
e quebra o app no build empacotado — exatamente a Armadilha A.

## Decisão

1. Os nomes de canal viram constantes string em `src/shared/contratos/canais.ts`, sem imports.
2. O preload importa `canais.ts` (valor) e `modelos.ts`/`api.ts` apenas como tipo.
3. O preload é empacotado por esbuild em um único arquivo CJS, com `electron` como externo.
   `tsc` continua compilando main + shared; o preload sai do `tsconfig.main.json`.
4. Zod e qualquer validação ficam em `esquemas.ts`, importado somente pelo main.

## Alternativas descartadas

- **Manter `const enum`** — funciona por acidente de inlining e não sobrevive a bundlers,
  `isolatedModules` ou ao uso do canal como valor.
- **Duplicar as strings no preload** — duas fontes de verdade; o primeiro rename quebra o app
  em runtime, sem erro de compilação.
- **Desligar `sandbox`** — reduz o isolamento do renderer e viola R2; descartado.

## Consequências

- Adicionar canal mexe em contrato, schema, handler, preload e renderer.
- O build ganha uma etapa (`build:preload`) e o dev ganha um watcher a mais.
- A verificação obrigatória é `dist/preload/index.js` sem `require("../shared/...")`.
- `canais.ts` não pode ganhar imports: é a única coisa que o preload carrega do shared.
