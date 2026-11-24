# ADR 0006 — Contrato do P1 e decisões de domínio

- **Status:** aceito
- **Data:** 2026-11-23
- **Decisores:** fundação (AS + ED), com decisões de negócio do produto

> ADRs 0004 (segurança) e 0005 (camadas) estão reservados para o C8/C9 do roteiro da semana 1.

## Contexto

O especialista Electron só inicia um módulo com contrato fechado em `shared/contratos/`: canais,
payload, retorno, erros de domínio tipados, enum de estado e migração das tabelas. Até aqui só
Categorias satisfazia isso; os demais módulos tinham apenas assinaturas de `listar` sem schema e
sem handler. Faltavam também cinco decisões de negócio que não cabem ao especialista tomar.

## Decisão

1. **Ordem:** P1 (Equipamentos CRUD) é o próximo pacote.
2. **Estado do equipamento:** `'disponivel' | 'em_manutencao' | 'baixado' | 'reservado'`, em
   `estados.ts` (fonte única do tipo e do `z.enum`). O campo `disponivel: boolean` é substituído.
   A inativação lógica é um campo separado, `ativo: boolean` — estado responde à operação,
   `ativo` responde ao histórico.
3. **Multa (P6):** incidência sobre o valor do equipamento, persistido desde o P1 como
   `valorAquisicao`. Carência de **90 dias** para atraso, configurável. Percentual proporcional,
   com teto de **10–20% do valor devido** (CDC/CC; cláusula abusiva pode ser reduzida
   judicialmente). O cálculo da diária considera depreciação, manutenção e margem de lucro; a
   fórmula é regra de negócio e mora no `MultaServico`, não no contrato nem no handler.
4. **Previsão do tempo (P5):** local da atividade, não cidade da loja.
5. **Divisão dos pacotes:** ver `docs/divisao-pacotes.md`.

## Alternativas descartadas

- **Manter `disponivel: boolean`** — não representa manutenção nem baixa, e P4/P8 precisam
  distinguir os dois estados para liberar ou bloquear reserva.
- **Multa em percentual fixo da diária** — não reflete o valor do bem e pode ser abusiva.
- **Cidade da loja na previsão** — o clima relevante é o do local da atividade.
- **Distribuir P6–P11 por ordem de pedido** — quebraria a cadeia de dependências (P6 depende de
  P5; P8 depende de P1/P4).

## Consequências

- `canais.ts`, `modelos.ts`, `esquemas.ts`, `api.ts` e o preload passam a cobrir CRUD, filtros por
  categoria/estado e `listarDisponiveis(inicio, fim)` do P1.
- A migração `002-equipamentos` cria a tabela com FK para `categorias`, `CHECK` de estado e
  `ativo` para inativação lógica.
- Erros de domínio são um union tipado; o IPC rejeita com `Error.message === codigo` e o renderer
  traduz para texto amigável. Nenhum detalhe de driver ou Zod cruza a ponte.
- **Transição temporária:** os canais do P1 já têm schema, mas ainda não têm handler registrado
  até o commit de implementação do P1. Não chamar a API do renderer nesse intervalo.
- Revisitar a carência de 90 dias e o teto antes de implementar o P6.
