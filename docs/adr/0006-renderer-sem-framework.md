# ADR 0006 — Renderer em TypeScript puro (sem React)

- **Status:** aceito
- **Data:** 2026-11-24
- **Decisores:** humano (decisão explícita) + Arquiteto de Software

## Contexto

O enunciado do projeto final descreve o renderer como "React + TypeScript". O checkout recebido
do frontend, porém, já entregou um renderer completo em **TypeScript puro com componentes
próprios** (`src/renderer/src/nucleo/Componente.ts`, `componentes/`, `layout/`, `paginas/`),
com Tailwind CSS v4, roteador, design system e 7 telas funcionando. As ADRs 0001 e 0004 e o
`AGENTS.md` registram "sem framework" como decisão da fundação desde o início.

Foi perguntado ao humano qual stack prevalecia e a resposta foi explícita: **manter TypeScript
puro**. Reescrever o renderer em React apagaria trabalho já revisado e aprovado do frontend.

## Decisão

Manter o renderer em TypeScript puro com Vite 8 + Tailwind CSS v4, sem React. O contrato
`window.electronAPI` (`ApiZenite`) continua sendo a única ponte com o main, e nenhuma biblioteca
de runtime de UI é adicionada.

## Alternativas descartadas

- **Migrar para React** — exigiria reescrever os componentes, o roteador e as 7 telas já
  entregues, invadindo o escopo do agente de frontend e contrariando ADR 0001/0004. O custo
  não traz ganho para o objetivo do projeto (contrato IPC e camadas).
- **Manter React ao lado do TS puro** — duas fontes de verdade de UI e build duplicado.

## Consequências

- Esta ADR **override** a menção a React no enunciado; a divergência está registrada e foi
  autorizada pelo humano. A ADR 0004 continua válida no que diz respeito ao Tailwind.
- O frontend segue dono de `src/renderer/`; componentes novos devem seguir
  `docs/padroes-codigo.md` e o design system, sem introduzir framework.
- `ApiZenite` expõe grupos opcionais (`fornecedores?`, `integracoes?` etc.) até o ED registrar
  os handlers; o renderer legado continua compilando.
- Revisitar apenas se o humano decidir adotar React; nesse caso esta ADR é substituída e o
  renderer é reescrito como um único trabalho, não aos poucos.
